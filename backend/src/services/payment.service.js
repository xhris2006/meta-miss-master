const prisma = require("../utils/prismaClient");
const axios = require("axios");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const { AppError } = require("../utils/errors");
const logger = require("../utils/logger");
const { emitRankingUpdate } = require("../socket/socket");
const { invalidateRankingCache } = require("./ranking.service");
const settingsService = require("./settings.service");

const VOTE_PRICE = 100;
const GENIUSPAY_BASE_URL = "https://pay.genius.ci/api/v1/merchant";
const PAYPAL_BASE_URL = process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com";
const PAYPAL_CURRENCY = process.env.PAYPAL_CURRENCY || "USD";
const PAYPAL_XAF_RATE = parseFloat(process.env.PAYPAL_XAF_RATE) || 650;

function amountToVotes(amount) {
  return Math.floor(amount / VOTE_PRICE);
}

// ─── FRAIS DE SERVICE ───────────────────────────────────────────────────────
// Frais GeniusPay répercutés sur le votant (opérateur + 1% GeniusPay + 100 XOF).
// IMPORTANT : calculés CÔTÉ SERVEUR (on ne fait pas confiance au feeAmount du
// client, sinon il pourrait forcer 0). Mêmes formules que le front.
//   africa : 4.5% + 100 · europe/cards : 6% + 100 · Fapshi/PayPal : 0
const GENIUSPAY_FEES = {
  africa: { percent: 4.5, fixed: 100 },
  europe: { percent: 6, fixed: 100 },
  cards: { percent: 6, fixed: 100 },
};

function computeServiceFee({ provider, region, amount }) {
  if (provider !== "geniuspay") return 0; // Fapshi, KPay et PayPal : pas de frais ajoutés
  const cfg = GENIUSPAY_FEES[region] || GENIUSPAY_FEES.africa;
  return Math.ceil((amount * cfg.percent) / 100) + cfg.fixed;
}

// ─── PAYS / ROUTAGE PROVIDER ─────────────────────────────────────────────────

const COUNTRY_ISO2 = {
  "cameroun": "CM", "cameroon": "CM",
  "côte d'ivoire": "CI", "cote d'ivoire": "CI", "cote divoire": "CI", "ivory coast": "CI",
  "sénégal": "SN", "senegal": "SN",
  "mali": "ML",
  "burkina faso": "BF", "burkina": "BF",
  "bénin": "BJ", "benin": "BJ",
  "togo": "TG",
  "niger": "NE",
  "guinée": "GN", "guinee": "GN",
  "ghana": "GH",
  "nigeria": "NG",
  "kenya": "KE",
  "rwanda": "RW",
  "ouganda": "UG", "uganda": "UG",
  "congo": "CG",
  "rd congo": "CD", "rdc": "CD",
  "gabon": "GA",
  "zambie": "ZM", "zambia": "ZM",
  "sierra leone": "SL",
  "france": "FR",
};

// Normalise un pays (code ISO2 ou nom FR/EN) en code ISO2. Défaut : CM.
function toIso2(country) {
  if (!country) return "CM";
  const c = String(country).trim();
  if (c.length === 2) return c.toUpperCase();
  return COUNTRY_ISO2[c.toLowerCase()] || "CM";
}

// Pays servis par l'agrégateur "précis" via la méthode "Afrique" (sans frais).
const PRECISE_AGGREGATOR_COUNTRIES = ["CM", "GA"];

// SÉCURITÉ : le provider est RE-DÉRIVÉ côté serveur à partir de (region, country).
// On IGNORE le provider envoyé par le client (sinon il pourrait forcer "fapshi"
// avec country=SN pour contourner les frais GeniusPay). Seul PayPal reste un
// choix explicite du client (bouton dédié, sans frais de service).
//
// TEMP : pour Cameroun + Gabon via la méthode "Afrique", on route vers KPay
// (redirection vers sa page de paiement hébergée) le temps de valider le flux.
// TODO : trancher l'agrégateur définitif pour ces pays — Fapshi ne couvre que le
// Cameroun ; pour le Gabon il faudra soit garder KPay, soit brancher un
// agrégateur Gabon dédié. Pour revenir à Fapshi : retourner "fapshi" ci-dessous.
function resolveProvider({ provider, region, country }) {
  if (provider === "paypal") return "paypal";
  if (!region) return "fapshi"; // bouton "Cameroun" (Orange + MTN via Fapshi)
  if (region === "africa" && PRECISE_AGGREGATOR_COUNTRIES.includes(toIso2(country))) {
    return "kpay"; // TEMP (voir ci-dessus)
  }
  return "geniuspay"; // reste de l'Afrique + Europe + Cartes
}

// ─── VOTER ────────────────────────────────────────────────────────────────────

async function findOrCreateVoter({ voterName, voterEmail, voterPhone }) {
  const email = voterEmail.toLowerCase().trim();
  const name = voterName.trim();
  const phone = voterPhone?.trim() || null;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role === "ADMIN") {
      throw new AppError("Cette adresse email ne peut pas etre utilisee pour voter", 400);
    }
    // SÉCURITÉ : ne JAMAIS écraser le profil d'un compte existant avec des
    // données de vote non authentifiées (sinon n'importe qui peut altérer le
    // nom/téléphone d'un autre utilisateur via /payments/initialize).
    // On complète uniquement les champs encore vides.
    const data = {};
    if (!existing.name && name) data.name = name;
    if (!existing.phone && phone) data.phone = phone;
    if (Object.keys(data).length === 0) return existing;
    return prisma.user.update({ where: { id: existing.id }, data });
  }

  const passwordHash = await bcrypt.hash(uuidv4(), 10);
  return prisma.user.create({
    data: { email, name, phone, passwordHash, role: "USER" },
  });
}

// ─── FAPSHI ───────────────────────────────────────────────────────────────────

async function initFapshi({ txRef, amount, userEmail, candidateName, votesCount, country }) {
  // Fapshi gère le choix de l'opérateur (Orange/MTN) sur sa page hébergée : pas
  // besoin de distinguer côté API. On logge le pays pour la traçabilité (Gabon…).
  logger.info(`Fapshi init: txRef=${txRef} country=${toIso2(country)}`);
  const response = await axios.post(
    "https://live.fapshi.com/initiate-pay",
    {
      amount,
      email: userEmail,
      redirectUrl: `${process.env.FRONTEND_URL}/vote/callback?tx_ref=${txRef}&provider=fapshi`,
      externalId: txRef,
      message: `${votesCount} vote(s) pour ${candidateName}`,
    },
    {
      headers: {
        apiuser: process.env.FAPSHI_API_USER,
        apikey: process.env.FAPSHI_API_KEY,
        "Content-Type": "application/json",
      },
    },
  );

  const data = response.data;

  // Fapshi retourne le lien dans différents champs selon la version de l'API
  const paymentLink =
    data.paymentLink ||
    data.link ||
    data.payment_link ||
    data?.data?.paymentLink ||
    data?.data?.link ||
    data?.data?.payment_link;

  // FIX : transId peut aussi être dans data.data
  const transId =
    data.transId ||
    data.trans_id ||
    data?.data?.transId ||
    data?.data?.trans_id;

  if (!paymentLink) {
    logger.error("Fapshi response sans paymentLink: " + JSON.stringify(data));
    throw new AppError(
      `Fapshi n'a pas retourné de lien de paiement. Message: ${data.message || "Inconnu"}`,
      502
    );
  }

  return { paymentLink, transId };
}

async function verifyFapshi(transId) {
  const response = await axios.get(
    `https://live.fapshi.com/payment-status/${transId}`,
    {
      headers: {
        apiuser: process.env.FAPSHI_API_USER,
        apikey: process.env.FAPSHI_API_KEY,
      },
    },
  );
  logger.info(`Fapshi verify response: status=${response.data?.status}`);
  return response.data;
}

// FIX : comparaison insensible à la casse
function isFapshiSuccessful(status) {
  if (!status) return false;
  return String(status).toUpperCase() === "SUCCESSFUL";
}

// ─── PAYPAL ───────────────────────────────────────────────────────────────────

async function getPayPalToken() {
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_SECRET) {
    throw new AppError("PayPal non configuré", 500);
  }

  const response = await axios.post(
    `${PAYPAL_BASE_URL}/v1/oauth2/token`,
    "grant_type=client_credentials",
    {
      auth: {
        username: process.env.PAYPAL_CLIENT_ID,
        password: process.env.PAYPAL_SECRET,
      },
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    },
  );

  if (!response.data?.access_token) {
    throw new AppError("Impossible de générer le jeton PayPal", 500);
  }

  return response.data.access_token;
}

async function initPayPal({ txRef, amount, candidateName, votesCount }) {
  const token = await getPayPalToken();
  const value = (Math.max(100, amount) / PAYPAL_XAF_RATE).toFixed(2);

  const response = await axios.post(
    `${PAYPAL_BASE_URL}/v2/checkout/orders`,
    {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: { currency_code: PAYPAL_CURRENCY, value },
          description: `${votesCount} vote(s) pour ${candidateName}`,
        },
      ],
      application_context: {
        return_url: `${process.env.FRONTEND_URL}/vote/callback?tx_ref=${txRef}&provider=paypal`,
        cancel_url: `${process.env.FRONTEND_URL}/vote/callback?tx_ref=${txRef}&status=cancelled`,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.data?.links) {
    throw new AppError("Impossible de démarrer le paiement PayPal", 502);
  }

  const approveLink = response.data.links.find((link) => link.rel === "approve")?.href;
  if (!approveLink) {
    throw new AppError("Impossible de récupérer le lien PayPal", 502);
  }

  return { paymentLink: approveLink, orderId: response.data.id };
}

async function verifyPayPal(orderId) {
  if (!orderId) throw new AppError("Identifiant PayPal manquant", 400);

  const token = await getPayPalToken();
  const response = await axios.get(
    `${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  const orderStatus = response.data?.status;
  if (orderStatus === "COMPLETED") return { success: true };

  if (orderStatus === "APPROVED") {
    try {
      const capture = await axios.post(
        `${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );
      if (capture.data?.status === "COMPLETED") return { success: true };
    } catch (captureError) {
      if (captureError.response?.data?.name === "ORDER_ALREADY_CAPTURED") {
        return { success: true };
      }
      throw captureError;
    }
  }

  return { success: false, status: orderStatus };
}

// ─── GENIUSPAY ────────────────────────────────────────────────────────────────

async function initGeniusPay({ txRef, amount, userEmail, userName, candidateName, voterPhone, country }) {
  if (!process.env.GENIUSPAY_API_KEY || !process.env.GENIUSPAY_API_SECRET) {
    throw new AppError("Clés GeniusPay non configurées", 500);
  }

  if (amount < 200) {
    throw new AppError("Montant minimum pour GeniusPay : 200 FCFA (2 votes)", 400);
  }

  const countryCode = toIso2(country);
  const rawDesc = `${candidateName} - ${amount.toLocaleString("fr-FR")} FCFA`;
  const description = rawDesc.length > 500 ? rawDesc.substring(0, 497) + "..." : rawDesc;
  const safeUserName = (userName || "Votant").substring(0, 100);

  const payload = {
    amount,
    description,
    customer: {
      name: safeUserName,
      email: userEmail,
      ...(voterPhone && { phone: voterPhone }),
      country: countryCode,
    },
    success_url: `${process.env.FRONTEND_URL}/vote/callback?tx_ref=${txRef}&provider=geniuspay&status=completed`,
    error_url: `${process.env.FRONTEND_URL}/vote/callback?tx_ref=${txRef}&provider=geniuspay&status=failed`,
    metadata: {
      candidateName,
      userEmail,
      txRef,
      country: countryCode,
    },
  };

  let response;
  try {
    response = await axios.post(`${GENIUSPAY_BASE_URL}/payments`, payload, {
      headers: {
        "X-API-Key": process.env.GENIUSPAY_API_KEY,
        "X-API-Secret": process.env.GENIUSPAY_API_SECRET,
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    logger.error("GeniusPay init error:", err.response?.data || err.message);
    throw new AppError(
      `Erreur GeniusPay: ${err.response?.data?.error?.message || err.message}`,
      502
    );
  }

  if (!response.data?.success || !response.data?.data) {
    logger.error("GeniusPay bad response:", response.data);
    throw new AppError(
      `Erreur GeniusPay: ${response.data?.error?.message || "Réponse invalide"}`,
      502
    );
  }

  const data = response.data.data;
  const paymentLink = data.checkout_url || data.payment_url;

  if (!paymentLink) {
    logger.error("GeniusPay no payment link:", data);
    throw new AppError("Impossible de récupérer le lien de paiement GeniusPay", 502);
  }

  logger.info(`GeniusPay payment created: id=${data.id} ref=${data.reference}`);

  return {
    paymentLink,
    // FIX : stocker l'ID interne ET la référence séparément
    geniuspayId: String(data.id),
    geniuspayReference: data.reference || String(data.id),
  };
}

// La doc expose GET /payments/{reference} (ex: MTX-...). On interroge donc par
// la référence en priorité, avec repli sur l'ID interne pour les anciens paiements.
async function verifyGeniusPay(identifiers) {
  if (!process.env.GENIUSPAY_API_KEY || !process.env.GENIUSPAY_API_SECRET) {
    throw new AppError("Clés GeniusPay non configurées", 500);
  }

  const list = (Array.isArray(identifiers) ? identifiers : [identifiers]).filter(Boolean);
  if (list.length === 0) return null;

  const headers = {
    "X-API-Key": process.env.GENIUSPAY_API_KEY,
    "X-API-Secret": process.env.GENIUSPAY_API_SECRET,
    "Content-Type": "application/json",
  };

  for (const id of list) {
    try {
      const response = await axios.get(
        `${GENIUSPAY_BASE_URL}/payments/${encodeURIComponent(id)}`,
        { headers },
      );
      logger.info(`GeniusPay verify response: status=${response.data?.data?.status} ref=${response.data?.data?.reference}`);
      if (response.data?.data) return response.data.data;
    } catch (err) {
      logger.error(`GeniusPay verify error (id=${id}):`, err.response?.data || err.message);
      // on tente l'identifiant suivant
    }
  }

  return null;
}

// FIX : insensible à la casse, couvre tous les statuts possibles
function isGeniusPaySuccessful(status) {
  if (!status) return false;
  return ["completed", "successful", "success"].includes(String(status).toLowerCase());
}

// ─── GENIUSPAY SIGNATURE ──────────────────────────────────────────────────────

function verifyGeniusPaySignature({ signature, timestamp, body }) {
  const secret = process.env.GENIUSPAY_WEBHOOK_SECRET;
  if (!secret) {
    logger.error("GENIUSPAY_WEBHOOK_SECRET non configuré");
    return false;
  }
  if (!signature) return false;

  try {
    // Format officiel (guide GeniusPay) :
    //   signature = HMAC-SHA256(timestamp + "." + payload, secret)
    // On vérifie le payload BRUT (le plus fiable, comme l'exemple Java), mais on
    // tolère aussi les variantes des autres exemples (payload ré-encodé, sans
    // timestamp) pour éviter tout faux négatif lié à la sérialisation.
    const rawBody = Buffer.isBuffer(body) ? body.toString("utf8") : String(body);

    let reStringified = null;
    try {
      reStringified = JSON.stringify(JSON.parse(rawBody));
    } catch (_) {
      reStringified = null;
    }

    const candidates = [
      `${timestamp}.${rawBody}`,           // officiel (raw body)
      rawBody,                             // sans timestamp
    ];
    if (reStringified !== null) {
      candidates.push(`${timestamp}.${reStringified}`); // payload ré-encodé
      candidates.push(reStringified);
    }

    const sigBuf = Buffer.from(signature, "hex");

    return candidates.some((data) => {
      const expected = crypto.createHmac("sha256", secret).update(data).digest("hex");
      const expBuf = Buffer.from(expected, "hex");
      return (
        expBuf.length === sigBuf.length &&
        crypto.timingSafeEqual(expBuf, sigBuf)
      );
    });
  } catch (err) {
    logger.error("GeniusPay signature verification error:", err.message);
    return false;
  }
}

// ─── GENIUSPAY WEBHOOK ────────────────────────────────────────────────────────

async function processGeniusPayWebhook(body) {
  const { event, data: eventData } = body;

  if (!event || !eventData) {
    logger.warn("GeniusPay webhook: body invalide", body);
    return;
  }

  // SÉCURITÉ : on ne logge pas eventData complet (nom/téléphone/email client).
  logger.info(`GeniusPay webhook event: ${event}`);

  if (event !== "payment.success") return;

  // Le guide officiel place la transaction directement dans `data`
  // (data.id, data.reference, data.status, data.metadata). On garde un
  // fallback vers data.transaction au cas où le format évoluerait.
  const tx = eventData.transaction || eventData;

  // 1) On retrouve le paiement via le txRef qu'on a placé dans metadata à la création.
  const txRef = tx?.metadata?.txRef || eventData?.metadata?.txRef;
  const reference = tx?.reference || eventData?.reference;
  const geniuspayId = tx?.id != null ? String(tx.id) : (eventData?.id != null ? String(eventData.id) : null);

  let payment = null;
  if (txRef) {
    payment = await prisma.payment.findUnique({
      where: { flutterwaveTxRef: txRef },
    });
  }

  // 2) Fallbacks : référence GeniusPay (MTX-...) ou ID interne, stockés à l'init.
  if (!payment && reference) {
    payment = await prisma.payment.findFirst({
      where: { flutterwaveTransId: reference },
    });
  }
  if (!payment && geniuspayId) {
    payment = await prisma.payment.findFirst({
      where: { flutterwaveFlwRef: geniuspayId },
    });
  }

  if (!payment) {
    logger.warn(
      `GeniusPay webhook: paiement introuvable (txRef=${txRef} ref=${reference} id=${geniuspayId})`
    );
    return;
  }

  // FIX : vérifier le statut AVANT de marquer webhookReceived
  if (payment.status === "COMPLETED") {
    logger.info(`GeniusPay webhook: déjà complété txRef=${txRef}`);
    return;
  }

  if (payment.webhookReceived && payment.status !== "PENDING") {
    logger.info(`GeniusPay webhook: paiement déjà traité txRef=${txRef}`);
    return;
  }

  // L'événement payment.success indique déjà un succès ; on confirme via le
  // statut de la transaction quand il est présent.
  const isSuccess = tx.status ? isGeniusPaySuccessful(tx.status) : true;

  try {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        webhookReceived: true,
        flutterwaveFlwRef: geniuspayId || payment.flutterwaveFlwRef,
        flutterwaveTransId: reference || geniuspayId || payment.flutterwaveTransId,
      },
    });

    if (isSuccess) {
      await creditVotes(payment);
      logger.info(`GeniusPay webhook: votes crédités txRef=${txRef} votes=${payment.votesCount}`);
    } else {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED" },
      });
      logger.warn(`GeniusPay webhook: paiement échoué txRef=${txRef} status=${tx.status}`);
    }
  } catch (err) {
    // FIX : reset webhookReceived si creditVotes plante → permet un retry
    logger.error(`GeniusPay webhook: erreur lors du crédit txRef=${txRef}`, err.message);
    await prisma.payment.update({
      where: { id: payment.id },
      data: { webhookReceived: false },
    }).catch(() => {});
    throw err;
  }
}

// ─── KPAY (Mobile Money — GATEWAY) ─────────────────────────────────────────────
// TEMP : agrégateur pour Cameroun + Gabon via la méthode "Afrique" (redirection
// vers la page de paiement hébergée KPay, sans frais de service). Le reste de
// l'Afrique + Europe + Cartes restent sur GeniusPay. Voir resolveProvider().
const KPAY_BASE_URL = "https://admin.kpay.site/api/v1";

const KPAY_COUNTRY_CODES = {
  CI: "225", SN: "221", ML: "223", BF: "226", BJ: "229",
  TG: "228", CM: "237", GH: "233", NG: "234",
};

function kpayHeaders() {
  return {
    "X-API-Key": process.env.KPAY_API_KEY,
    "X-Secret-Key": process.env.KPAY_SECRET_KEY,
    "Content-Type": "application/json",
  };
}

// Normalise un numéro au format international attendu par KPay (chiffres, sans +/0 initial).
function kpayNormalizePhone(phone, country) {
  let p = String(phone || "").replace(/\D/g, "");
  p = p.replace(/^0+/, "");
  const code = KPAY_COUNTRY_CODES[country];
  if (code && !p.startsWith(code)) p = code + p;
  return p;
}

function isKPaySuccessful(status) {
  return String(status || "").toUpperCase() === "COMPLETED";
}

// Déduit le provider Mobile Money (MTN_MOMO_CIV, ORANGE_SEN…) à partir du numéro.
async function kpayPredictProvider(phoneNumber) {
  try {
    const r = await axios.post(
      `${KPAY_BASE_URL}/payments/predict-provider`,
      { phoneNumber },
      { headers: kpayHeaders() },
    );
    return r.data?.provider || null;
  } catch (err) {
    logger.error("KPay predict-provider error:", err.response?.data || err.message);
    return null;
  }
}

// Mode GATEWAY : KPay héberge la page de paiement, on redirige le votant vers
// gatewayUrl. Le client choisit lui-même opérateur + numéro sur la page KPay.
async function initKPay({ txRef, amount, candidateName }) {
  if (!process.env.KPAY_API_KEY || !process.env.KPAY_SECRET_KEY) {
    throw new AppError("Clés KPay non configurées", 500);
  }

  const returnUrl = `${process.env.FRONTEND_URL}/vote/callback?tx_ref=${txRef}&provider=kpay`;
  const cancelUrl = `${process.env.FRONTEND_URL}/vote/callback?tx_ref=${txRef}&provider=kpay&status=cancelled`;

  let response;
  try {
    response = await axios.post(
      `${KPAY_BASE_URL}/payments/init`,
      {
        amount,
        externalId: txRef,
        returnUrl,
        cancelUrl,
        description: `Vote(s) pour ${candidateName}`.substring(0, 140),
        metadata: { txRef, candidateName },
      },
      { headers: kpayHeaders() },
    );
  } catch (err) {
    logger.error("KPay init error:", err.response?.data || err.message);
    throw new AppError(`Erreur KPay: ${err.response?.data?.message || err.message}`, 502);
  }

  const data = response.data || {};
  const gatewayUrl = data.gatewayUrl || data.gateway_url;
  if (!gatewayUrl) {
    logger.error("KPay: pas de gatewayUrl dans la réponse:", data);
    throw new AppError("KPay n'a pas retourné de lien de paiement", 502);
  }

  logger.info(`KPay gateway created: id=${data.id} ref=${data.reference}`);

  return {
    paymentLink: gatewayUrl, // GATEWAY : redirection vers la page KPay
    kpayId: data.id != null ? String(data.id) : null,
    kpayReference: data.reference || (data.id != null ? String(data.id) : null),
  };
}

async function verifyKPay(kpayId) {
  if (!kpayId) return null;
  try {
    const r = await axios.get(
      `${KPAY_BASE_URL}/payments/${encodeURIComponent(kpayId)}`,
      { headers: kpayHeaders() },
    );
    logger.info(`KPay verify: id=${kpayId} status=${r.data?.status}`);
    return r.data || null;
  } catch (err) {
    logger.error("KPay verify error:", err.response?.data || err.message);
    return null;
  }
}

// Vérifie la signature HMAC-SHA256 du webhook KPay (sur le corps BRUT reçu).
function verifyKPaySignature({ signature, body }) {
  const secret = process.env.KPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  try {
    const raw = Buffer.isBuffer(body) ? body.toString("utf8") : String(body);
    const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(String(signature), "hex");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch (err) {
    logger.error("KPay signature verification error:", err.message);
    return false;
  }
}

async function processKPayWebhook(body) {
  const event = body.event;
  if (!event) return;

  // On ne traite que les dépôts (paiements). Payout/refund non utilisés ici.
  if (!String(event).startsWith("payment.")) {
    logger.info(`KPay webhook ignoré (non-dépôt): ${event}`);
    return;
  }

  const externalId = body.externalId;
  const kpayId = body.paymentId;
  logger.info(`KPay webhook: event=${event} externalId=${externalId} id=${kpayId}`);

  let payment = null;
  if (externalId) {
    payment = await prisma.payment.findUnique({ where: { flutterwaveTxRef: externalId } });
  }
  if (!payment && kpayId) {
    payment = await prisma.payment.findFirst({ where: { flutterwaveFlwRef: String(kpayId) } });
  }
  if (!payment) {
    logger.warn(`KPay webhook: paiement introuvable (externalId=${externalId} id=${kpayId})`);
    return;
  }
  if (payment.status === "COMPLETED") return;

  if (event === "payment.failed" || event === "payment.cancelled") {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED", webhookReceived: true } });
    logger.warn(`KPay webhook: paiement échoué/annulé txRef=${payment.flutterwaveTxRef}`);
    return;
  }

  // SÉCURITÉ : on revérifie le statut réel via l'API KPay avant de créditer.
  let confirmed = false;
  try {
    const verified = await verifyKPay(kpayId || payment.flutterwaveFlwRef);
    confirmed = isKPaySuccessful(verified?.status);
  } catch (_) {
    confirmed = false;
  }

  if (event === "payment.completed" && confirmed) {
    try {
      await prisma.payment.update({ where: { id: payment.id }, data: { webhookReceived: true } });
      await creditVotes(payment);
      logger.info(`KPay webhook: votes crédités txRef=${payment.flutterwaveTxRef} votes=${payment.votesCount}`);
    } catch (err) {
      logger.error(`KPay webhook: erreur crédit txRef=${payment.flutterwaveTxRef}`, err.message);
      await prisma.payment.update({ where: { id: payment.id }, data: { webhookReceived: false } }).catch(() => {});
      throw err;
    }
  } else {
    logger.info(`KPay webhook: pas de crédit (event=${event} confirmé=${confirmed})`);
  }
}

// ─── INITIALIZE PAYMENT ───────────────────────────────────────────────────────

async function initializePayment({ candidateId, amount, provider: clientProvider, region, country, voterName, voterEmail, voterPhone }) {
  const contest = await prisma.contest.findFirst({ where: { status: "OPEN" } });
  if (!contest) throw new AppError("Les votes sont actuellement fermés", 403);

  const candidate = await prisma.candidate.findFirst({
    where: { id: candidateId, status: "APPROVED" },
  });
  if (!candidate) throw new AppError("Candidat introuvable ou non approuvé", 404);

  // `amount` = BASE (votes × 100). Les votes et le revenu se basent dessus.
  const baseVotes = amountToVotes(amount);
  if (baseVotes < 1) throw new AppError("Montant minimum : 100 FCFA", 400);

  // SÉCURITÉ : provider RE-DÉRIVÉ serveur depuis (region, country) — celui du
  // client est ignoré (anti-contournement des frais). Voir resolveProvider.
  const provider = resolveProvider({ provider: clientProvider, region, country });
  const iso2 = toIso2(country);

  // Montant minimum selon le provider RE-DÉRIVÉ (pas celui du client).
  const minAmount = provider === "geniuspay" ? 200 : 100;
  if (amount < minAmount) {
    throw new AppError(
      `Montant minimum : ${minAmount} FCFA${provider === "geniuspay" ? " (2 votes avec ce mode de paiement)" : ""}`,
      400,
    );
  }

  // Promo "votes doubles" : si l'admin a activé l'option, les votes lancés
  // pendant la période active comptent ×2 (le montant payé reste identique).
  const doubleActive = await settingsService.getDoubleVotes();
  const votesCount = doubleActive ? baseVotes * 2 : baseVotes;

  // Frais recalculés serveur (jamais ceux du client) + montant réellement facturé.
  // Fapshi / KPay / PayPal : 0 — GeniusPay : selon la région.
  const serviceFee = computeServiceFee({ provider, region, amount });
  const chargeAmount = amount + serviceFee;

  const voter = await findOrCreateVoter({ voterName, voterEmail, voterPhone });
  const txRef = `MMM-${provider.toUpperCase()}-${uuidv4()}`;

  const payment = await prisma.payment.create({
    data: {
      userId: voter.id,
      candidateId,
      amount, // BASE — sert aux votes et au revenu (les frais vont au PSP)
      votesCount,
      flutterwaveTxRef: txRef,
      status: "PENDING",
      metadata: {
        provider,            // provider RE-DÉRIVÉ serveur (source de vérité)
        clientProvider: clientProvider || null, // ce que le front avait envoyé (trace)
        gateway: provider,   // passerelle réellement utilisée
        region: region || null,
        country: iso2,       // ISO2 normalisé
        serviceFee,          // frais répercutés sur le votant
        chargeAmount,        // montant réellement débité (base + frais)
        baseVotes,           // votes avant promo
        doubleVotes: doubleActive, // promo ×2 appliquée à ce paiement
        candidateName: candidate.name,
        candidateType: candidate.type,
        voterName: voter.name,
        voterEmail: voter.email,
        voterPhone: voter.phone,
      },
    },
  });

  const params = {
    txRef,
    amount: chargeAmount, // SÉCURITÉ/FACTURATION : on facture base + frais au PSP
    userEmail: voter.email,
    userName: voter.name || voter.email,
    candidateName: candidate.name,
    votesCount,
    country: iso2,
    voterPhone: voter.phone,
  };

  let paymentLink = "";

  try {
    if (provider === "fapshi") {
      const result = await initFapshi(params);
      paymentLink = result.paymentLink;
      // FIX : stocker transId même si null — le webhook le mettra à jour
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          flutterwaveFlwRef: result.transId || null,
          flutterwaveTransId: result.transId || null,
        },
      });

    } else if (provider === "paypal") {
      const result = await initPayPal(params);
      paymentLink = result.paymentLink;
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          flutterwaveFlwRef: result.orderId,
          flutterwaveTransId: result.orderId,
        },
      });

    } else if (provider === "kpay") {
      // ── CAMEROUN + GABON (méthode "Afrique") : KPay en mode GATEWAY ──
      // TEMP — redirection vers la page de paiement hébergée KPay, sans frais.
      const result = await initKPay({
        txRef,
        amount: chargeAmount,
        candidateName: candidate.name,
      });
      paymentLink = result.paymentLink; // URL de la passerelle KPay → redirection
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          flutterwaveFlwRef: result.kpayId,
          flutterwaveTransId: result.kpayReference,
        },
      });

    } else if (provider === "geniuspay") {
      // ── RESTE DE L'AFRIQUE + EUROPE + CARTES : GeniusPay (avec frais) ──
      const result = await initGeniusPay(params);
      paymentLink = result.paymentLink;
      // FIX : flutterwaveFlwRef = ID interne (pour verifyGeniusPay)
      //        flutterwaveTransId = référence humaine (pour traçabilité)
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          flutterwaveFlwRef: result.geniuspayId,
          flutterwaveTransId: result.geniuspayReference,
        },
      });
    }
  } catch (err) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED" },
    });
    if (err instanceof AppError) throw err;
    logger.error(`[${provider}] init error:`, err.response?.data || err.message);
    throw new AppError(`Erreur lors de l'initialisation du paiement (${provider})`, 502);
  }

  logger.info(`Payment initialized: provider=${provider} txRef=${txRef} amount=${amount} votes=${votesCount}`);

  return {
    paymentId: payment.id,
    txRef,
    paymentLink,
    votesCount,
    amount,              // base (votes)
    serviceFee,          // frais
    chargeAmount,        // total débité
    candidateName: candidate.name,
    provider,
  };
}

// ─── VERIFY PAYMENT ───────────────────────────────────────────────────────────

async function verifyPayment(txRef) {
  const payment = await prisma.payment.findUnique({
    where: { flutterwaveTxRef: txRef },
  });
  if (!payment) throw new AppError("Transaction introuvable", 404);

  if (payment.status === "COMPLETED") {
    return {
      status: "COMPLETED",
      votesCount: payment.votesCount,
      message: "Votes déjà crédités",
    };
  }

  if (payment.status === "FAILED") {
    return { status: "FAILED", message: "Paiement échoué" };
  }

  // On route sur la passerelle réellement utilisée (gateway), avec repli sur provider.
  const provider = payment.metadata?.gateway || payment.metadata?.provider || "fapshi";

  try {
    let success = false;

    if (provider === "kpay") {
      const kpayId = payment.flutterwaveFlwRef;
      if (!kpayId) return { status: "PENDING", message: "En attente KPay" };
      const result = await verifyKPay(kpayId);
      success = isKPaySuccessful(result?.status);

    } else if (provider === "fapshi") {
      const transId = payment.flutterwaveFlwRef;
      if (!transId) {
        // FIX : si transId manque, on attend le webhook — on ne peut pas vérifier
        logger.warn(`Fapshi verify: transId manquant pour txRef=${txRef}, attente webhook`);
        return { status: "PENDING", message: "En attente de confirmation Fapshi" };
      }
      const result = await verifyFapshi(transId);
      success = isFapshiSuccessful(result.status);

    } else if (provider === "paypal") {
      const orderId = payment.flutterwaveFlwRef;
      if (!orderId) return { status: "PENDING", message: "En attente PayPal" };
      const result = await verifyPayPal(orderId);
      success = result.success === true;

    } else if (provider === "geniuspay") {
      // flutterwaveTransId = référence GeniusPay (MTX-...) → prioritaire pour l'API
      // flutterwaveFlwRef   = ID interne → repli
      const reference = payment.flutterwaveTransId;
      const geniuspayId = payment.flutterwaveFlwRef;
      if (!reference && !geniuspayId) {
        return { status: "PENDING", message: "En attente GeniusPay" };
      }
      const result = await verifyGeniusPay([reference, geniuspayId]);
      // FIX : utilise la fonction insensible à la casse
      success = isGeniusPaySuccessful(result?.status);
    }

    if (success) {
      if (payment.status !== "PENDING") {
        return {
          status: payment.status,
          votesCount: payment.votesCount,
          message: "Déjà traité",
        };
      }
      await creditVotes(payment);
      return {
        status: "COMPLETED",
        votesCount: payment.votesCount,
        message: "Votes crédités avec succès !",
      };
    }

    return { status: "PENDING", message: "Paiement en attente de confirmation" };
  } catch (err) {
    logger.error("Verify error:", err.message);
    return { status: "PENDING", message: "Vérification impossible pour l'instant" };
  }
}

// ─── FAPSHI WEBHOOK ───────────────────────────────────────────────────────────

async function processFapshiWebhook(body) {
  // FIX : Fapshi peut envoyer externalId ou external_id selon la version
  const txRef = body.externalId || body.external_id;
  const status = body.status;
  // SÉCURITÉ : on ne logge pas le body complet (PII). Seulement les identifiants.
  logger.info(`Fapshi webhook received: txRef=${txRef} status=${status}`);
  // FIX : Fapshi peut envoyer transId ou trans_id
  const transId = body.transId || body.trans_id;

  if (!txRef) {
    logger.warn("Fapshi webhook: txRef (externalId) manquant dans le body");
    return;
  }

  const payment = await prisma.payment.findUnique({
    where: { flutterwaveTxRef: txRef },
  });

  if (!payment) {
    logger.warn(`Fapshi webhook: paiement introuvable pour txRef=${txRef}`);
    return;
  }

  if (payment.status === "COMPLETED") {
    logger.info(`Fapshi webhook: déjà complété txRef=${txRef}`);
    return;
  }

  if (payment.webhookReceived && payment.status !== "PENDING") {
    logger.info(`Fapshi webhook: déjà traité txRef=${txRef}`);
    return;
  }

  // FIX : mettre à jour transId si disponible (au cas où il manquait à l'init)
  const updateData = { webhookReceived: true };
  if (transId) {
    updateData.flutterwaveFlwRef = transId;
    updateData.flutterwaveTransId = transId;
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: updateData,
  });

  // SÉCURITÉ : le webhook Fapshi n'est PAS signé. On ne fait jamais confiance au
  // statut envoyé dans le body — on revérifie le statut réel auprès de l'API
  // Fapshi avec le transId. Sans confirmation API, aucun crédit n'est accordé.
  const transIdForCheck = transId || payment.flutterwaveFlwRef;
  if (!transIdForCheck) {
    logger.warn(`Fapshi webhook: transId manquant, vérification impossible txRef=${txRef}`);
    await prisma.payment.update({
      where: { id: payment.id },
      data: { webhookReceived: false },
    }).catch(() => {});
    return;
  }

  let confirmedSuccessful;
  try {
    const verified = await verifyFapshi(transIdForCheck);
    confirmedSuccessful = isFapshiSuccessful(verified.status);
  } catch (err) {
    // Vérification impossible pour l'instant → on n'inscrit rien et on autorise un retry.
    logger.error(`Fapshi webhook: échec vérification API txRef=${txRef}`, err.message);
    await prisma.payment.update({
      where: { id: payment.id },
      data: { webhookReceived: false },
    }).catch(() => {});
    return;
  }

  if (confirmedSuccessful) {
    try {
      await creditVotes(payment);
      logger.info(`Fapshi webhook: votes crédités (statut confirmé API) txRef=${txRef} votes=${payment.votesCount}`);
    } catch (err) {
      // FIX : reset webhookReceived pour permettre un retry
      logger.error(`Fapshi webhook: erreur crédit txRef=${txRef}`, err.message);
      await prisma.payment.update({
        where: { id: payment.id },
        data: { webhookReceived: false },
      }).catch(() => {});
      throw err;
    }
  } else {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED" },
    });
    logger.warn(`Fapshi webhook: paiement non confirmé par l'API txRef=${txRef}`);
  }
}

// ─── CREDIT VOTES ─────────────────────────────────────────────────────────────

async function creditVotes(payment) {
  const credited = await prisma.$transaction(async (tx) => {
    // Idempotence : si status n'est plus PENDING, count=0 → on skip sans erreur
    const result = await tx.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: { status: "COMPLETED" },
    });

    if (result.count === 0) {
      logger.warn(`creditVotes: paiement ${payment.id} déjà traité (count=0), skip`);
      return false;
    }

    await tx.vote.create({
      data: {
        userId: payment.userId,
        candidateId: payment.candidateId,
        count: payment.votesCount,
        paymentId: payment.id,
      },
    });

    await tx.candidate.update({
      where: { id: payment.candidateId },
      data: { totalVotes: { increment: payment.votesCount } },
    });

    logger.info(`creditVotes OK: ${payment.votesCount} votes → candidat ${payment.candidateId}`);
    return true;
  });

  if (credited) {
    invalidateRankingCache();   // vider le cache avant d'émettre le socket
    await emitRankingUpdate();  // envoyer les nouvelles données fraîches
  }

  return credited;
}

// ─── USER PAYMENTS ────────────────────────────────────────────────────────────

async function getUserPayments(userId, page, limit) {
  const skip = (page - 1) * limit;
  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.payment.count({ where: { userId } }),
  ]);

  return { payments, total, page, totalPages: Math.ceil(total / limit) };
}

module.exports = {
  initializePayment,
  verifyPayment,
  processFapshiWebhook,
  processGeniusPayWebhook,
  verifyGeniusPaySignature,
  processKPayWebhook,
  verifyKPaySignature,
  getUserPayments,
  creditVotes,
};
