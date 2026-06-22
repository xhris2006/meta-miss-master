const prisma = require("../utils/prismaClient");
const axios = require("axios");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const { AppError } = require("../utils/errors");
const logger = require("../utils/logger");
const { emitRankingUpdate } = require("../socket/socket");
const { invalidateRankingCache } = require("./ranking.service");

const VOTE_PRICE = 100;
const GENIUSPAY_BASE_URL = "https://pay.genius.ci/api/v1/merchant";
const PAYPAL_BASE_URL = process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com";
const PAYPAL_CURRENCY = process.env.PAYPAL_CURRENCY || "USD";
const PAYPAL_XAF_RATE = parseFloat(process.env.PAYPAL_XAF_RATE) || 650;

function amountToVotes(amount) {
  return Math.floor(amount / VOTE_PRICE);
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
    return prisma.user.update({
      where: { id: existing.id },
      data: { name, phone },
    });
  }

  const passwordHash = await bcrypt.hash(uuidv4(), 10);
  return prisma.user.create({
    data: { email, name, phone, passwordHash, role: "USER" },
  });
}

// ─── FAPSHI ───────────────────────────────────────────────────────────────────

async function initFapshi({ txRef, amount, userEmail, candidateName, votesCount }) {
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

  logger.info("Fapshi raw response: " + JSON.stringify(response.data));

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
  logger.info("Fapshi verify response: " + JSON.stringify(response.data));
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

  const resolveCountry = (c) => {
    if (!c) return "CM";
    if (c.length === 2) return c.toUpperCase();
    return COUNTRY_ISO2[c.toLowerCase().trim()] || "CM";
  };

  const countryCode = resolveCountry(country);
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

  logger.info("GeniusPay raw response: " + JSON.stringify(response.data));

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

// FIX : utilise l'ID interne GeniusPay (plus fiable que la référence)
async function verifyGeniusPay(geniuspayId) {
  if (!process.env.GENIUSPAY_API_KEY || !process.env.GENIUSPAY_API_SECRET) {
    throw new AppError("Clés GeniusPay non configurées", 500);
  }

  try {
    const response = await axios.get(
      `${GENIUSPAY_BASE_URL}/payments/${geniuspayId}`,
      {
        headers: {
          "X-API-Key": process.env.GENIUSPAY_API_KEY,
          "X-API-Secret": process.env.GENIUSPAY_API_SECRET,
          "Content-Type": "application/json",
        },
      },
    );
    logger.info("GeniusPay verify response: " + JSON.stringify(response.data));
    return response.data?.data || null;
  } catch (err) {
    logger.error("GeniusPay verify error:", err.response?.data || err.message);
    return null;
  }
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

  try {
    const rawBody = Buffer.isBuffer(body) ? body.toString("utf8") : JSON.stringify(body);
    const data = `${timestamp}.${rawBody}`;
    const expected = crypto
      .createHmac("sha256", secret)
      .update(data)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex")
    );
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

  logger.info(`GeniusPay webhook event: ${event} | data: ${JSON.stringify(eventData)}`);

  if (event !== "payment.success") return;

  const txRef = eventData?.metadata?.txRef;
  if (!txRef) {
    logger.warn("GeniusPay webhook: txRef manquant dans metadata", eventData);
    return;
  }

  const payment = await prisma.payment.findUnique({
    where: { flutterwaveTxRef: txRef },
  });

  if (!payment) {
    logger.warn(`GeniusPay webhook: paiement introuvable pour txRef=${txRef}`);
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

  const isSuccess = isGeniusPaySuccessful(eventData.status);

  try {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        webhookReceived: true,
        flutterwaveFlwRef: String(eventData.id || "") || payment.flutterwaveFlwRef,
        flutterwaveTransId: eventData.reference || String(eventData.id || ""),
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
      logger.warn(`GeniusPay webhook: paiement échoué txRef=${txRef} status=${eventData.status}`);
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

// ─── INITIALIZE PAYMENT ───────────────────────────────────────────────────────

async function initializePayment({ candidateId, amount, feeAmount = 0, provider, region, country, voterName, voterEmail, voterPhone }) {
  const contest = await prisma.contest.findFirst({ where: { status: "OPEN" } });
  if (!contest) throw new AppError("Les votes sont actuellement fermés", 403);

  const candidate = await prisma.candidate.findFirst({
    where: { id: candidateId, status: "APPROVED" },
  });
  if (!candidate) throw new AppError("Candidat introuvable ou non approuvé", 404);

  // Les votes sont calculés sur le montant de base. Les frais éventuels
  // (modes GeniusPay) sont répercutés sur le votant mais ne donnent pas de votes.
  const votesCount = amountToVotes(amount);
  if (votesCount < 1) throw new AppError("Montant minimum : 100 FCFA", 400);

  const validProviders = ["fapshi", "paypal", "geniuspay"];
  if (!validProviders.includes(provider)) throw new AppError("Provider invalide", 400);

  const fee = provider === "geniuspay" ? Math.max(0, Math.floor(feeAmount || 0)) : 0;
  const chargedAmount = amount + fee;

  const voter = await findOrCreateVoter({ voterName, voterEmail, voterPhone });
  const txRef = `MMM-${provider.toUpperCase()}-${uuidv4()}`;

  const payment = await prisma.payment.create({
    data: {
      userId: voter.id,
      candidateId,
      amount, // montant de base (base des votes)
      votesCount,
      flutterwaveTxRef: txRef,
      status: "PENDING",
      metadata: {
        provider,
        region: region || null,
        feeAmount: fee,
        chargedAmount, // total réellement débité au votant (base + frais)
        country: country || "CM",
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
    amount: chargedAmount, // la passerelle débite le total (base + frais)
    userEmail: voter.email,
    userName: voter.name || voter.email,
    candidateName: candidate.name,
    votesCount,
    country,
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

    } else if (provider === "geniuspay") {
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
    amount,
    feeAmount: fee,
    chargedAmount,
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

  const provider = payment.metadata?.provider || "fapshi";

  try {
    let success = false;

    if (provider === "fapshi") {
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
      const geniuspayId = payment.flutterwaveFlwRef;
      if (!geniuspayId) return { status: "PENDING", message: "En attente GeniusPay" };
      const result = await verifyGeniusPay(geniuspayId);
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
  logger.info("Fapshi webhook received: " + JSON.stringify(body));

  // FIX : Fapshi peut envoyer externalId ou external_id selon la version
  const txRef = body.externalId || body.external_id;
  const status = body.status;
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

  // FIX : comparaison insensible à la casse
  if (isFapshiSuccessful(status)) {
    try {
      await creditVotes(payment);
      logger.info(`Fapshi webhook: votes crédités txRef=${txRef} votes=${payment.votesCount}`);
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
    logger.warn(`Fapshi webhook: paiement non réussi txRef=${txRef} status=${status}`);
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
  getUserPayments,
  creditVotes,
};
