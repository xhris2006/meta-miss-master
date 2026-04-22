const { PrismaClient } = require("@prisma/client");
const axios = require("axios");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const { AppError } = require("../utils/errors");
const logger = require("../utils/logger");
const { emitRankingUpdate } = require("../socket/socket");

const prisma = new PrismaClient();
const VOTE_PRICE = 100;

function amountToVotes(amount) {
  return Math.floor(amount / VOTE_PRICE);
}

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
    data: {
      email,
      name,
      phone,
      passwordHash,
      role: "USER",
    },
  });
}

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

  if (response.data.statusCode !== 200 && !response.data.paymentLink) {
    throw new AppError(`Erreur Fapshi: ${response.data.message || "Inconnue"}`, 502);
  }

  return { paymentLink: response.data.paymentLink, transId: response.data.transId };
}

async function verifyFapshi(transId) {
  const response = await axios.get(`https://live.fapshi.com/payment-status/${transId}`, {
    headers: {
      apiuser: process.env.FAPSHI_API_USER,
      apikey: process.env.FAPSHI_API_KEY,
    },
  });

  return response.data;
}

async function initCinetPay({ txRef, amount, userEmail, userName, candidateName, votesCount }) {
  const response = await axios.post(
    "https://api-checkout.cinetpay.com/v2/payment",
    {
      apikey: process.env.CINETPAY_API_KEY,
      site_id: process.env.CINETPAY_SITE_ID,
      transaction_id: txRef,
      amount,
      currency: "XAF",
      description: `${votesCount} vote(s) pour ${candidateName}`,
      customer_email: userEmail,
      customer_name: userName,
      notify_url: `${process.env.BACKEND_URL}/api/payments/webhook/cinetpay`,
      return_url: `${process.env.FRONTEND_URL}/vote/callback?tx_ref=${txRef}&provider=cinetpay`,
      channels: "ALL",
      lang: "fr",
    },
    { headers: { "Content-Type": "application/json" } },
  );

  if (response.data.code !== "201") {
    throw new AppError(`Erreur CinetPay: ${response.data.message || "Inconnue"}`, 502);
  }

  return { paymentLink: response.data.data.payment_url };
}

async function verifyCinetPay(txRef) {
  const response = await axios.post(
    "https://api-checkout.cinetpay.com/v2/payment/check",
    {
      apikey: process.env.CINETPAY_API_KEY,
      site_id: process.env.CINETPAY_SITE_ID,
      transaction_id: txRef,
    },
    { headers: { "Content-Type": "application/json" } },
  );

  return response.data;
}

let stripe;
function getStripe() {
  if (!stripe) {
    const Stripe = require("stripe");
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }

  return stripe;
}

async function initStripe({ txRef, amount, userEmail, candidateName, votesCount }) {
  const stripeClient = getStripe();
  const amountEurCents = Math.round((amount / 655.96) * 100);

  const session = await stripeClient.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: `${votesCount} vote(s) - META MISS & MASTER`,
            description: `Pour : ${candidateName}`,
          },
          unit_amount: amountEurCents,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    customer_email: userEmail,
    client_reference_id: txRef,
    success_url: `${process.env.FRONTEND_URL}/vote/callback?tx_ref=${txRef}&provider=stripe&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/vote/callback?tx_ref=${txRef}&status=cancelled`,
    metadata: { txRef, votesCount: String(votesCount) },
  });

  return { paymentLink: session.url, sessionId: session.id };
}

async function initializePayment({ candidateId, amount, provider, voterName, voterEmail, voterPhone }) {
  const contest = await prisma.contest.findFirst({ where: { status: "OPEN" } });
  if (!contest) throw new AppError("Les votes sont actuellement fermes", 403);

  const candidate = await prisma.candidate.findFirst({
    where: { id: candidateId, status: "APPROVED" },
  });
  if (!candidate) throw new AppError("Candidat introuvable ou non approuve", 404);

  const votesCount = amountToVotes(amount);
  if (votesCount < 1) throw new AppError("Montant minimum : 100 FCFA", 400);

  const validProviders = ["fapshi", "cinetpay", "stripe"];
  if (!validProviders.includes(provider)) throw new AppError("Provider invalide", 400);

  const voter = await findOrCreateVoter({ voterName, voterEmail, voterPhone });
  const txRef = `MMM-${provider.toUpperCase()}-${uuidv4()}`;

  const payment = await prisma.payment.create({
    data: {
      userId: voter.id,
      candidateId,
      amount,
      votesCount,
      flutterwaveTxRef: txRef,
      status: "PENDING",
      metadata: {
        provider,
        candidateName: candidate.name,
        candidateType: candidate.type,
        voterName: voter.name,
        voterEmail: voter.email,
      },
    },
  });

  const params = {
    txRef,
    amount,
    userEmail: voter.email,
    userName: voter.name || voter.email,
    candidateName: candidate.name,
    votesCount,
  };

  let paymentLink = "";

  try {
    if (provider === "fapshi") {
      const result = await initFapshi(params);
      paymentLink = result.paymentLink;
      if (result.transId) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { flutterwaveFlwRef: result.transId },
        });
      }
    } else if (provider === "cinetpay") {
      const result = await initCinetPay(params);
      paymentLink = result.paymentLink;
    } else {
      const result = await initStripe(params);
      paymentLink = result.paymentLink;
      if (result.sessionId) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { flutterwaveTransId: result.sessionId },
        });
      }
    }
  } catch (err) {
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
    candidateName: candidate.name,
    provider,
  };
}

async function verifyPayment(txRef) {
  const payment = await prisma.payment.findUnique({ where: { flutterwaveTxRef: txRef } });
  if (!payment) throw new AppError("Transaction introuvable", 404);
  if (payment.status === "COMPLETED") {
    return {
      status: "COMPLETED",
      votesCount: payment.votesCount,
      message: "Votes deja credites",
    };
  }
  if (payment.status === "FAILED") {
    return { status: "FAILED", message: "Paiement echoue" };
  }

  const provider = payment.metadata?.provider || "fapshi";

  try {
    let success = false;

    if (provider === "fapshi") {
      const transId = payment.flutterwaveFlwRef;
      if (!transId) return { status: "PENDING", message: "En attente de confirmation" };
      const result = await verifyFapshi(transId);
      success = result.status === "SUCCESSFUL";
    } else if (provider === "cinetpay") {
      const result = await verifyCinetPay(txRef);
      success = result.code === "00" && result.data?.status === "ACCEPTED";
    } else {
      const stripeClient = getStripe();
      const sessionId = payment.flutterwaveTransId;
      if (!sessionId) return { status: "PENDING", message: "En attente Stripe" };
      const session = await stripeClient.checkout.sessions.retrieve(sessionId);
      success = session.payment_status === "paid";
    }

    if (success) {
      if (payment.status !== "PENDING") {
        return {
          status: payment.status,
          votesCount: payment.votesCount,
          message: "Deja traite",
        };
      }

      await creditVotes(payment);
      return {
        status: "COMPLETED",
        votesCount: payment.votesCount,
        message: "Votes credites avec succes !",
      };
    }

    return { status: "PENDING", message: "Paiement en attente de confirmation" };
  } catch (err) {
    logger.error("Verify error:", err.message);
    return { status: "PENDING", message: "Verification impossible pour l'instant" };
  }
}

async function processFapshiWebhook(body) {
  const { externalId: txRef, status, transId } = body;
  if (!txRef) return;

  const payment = await prisma.payment.findUnique({ where: { flutterwaveTxRef: txRef } });
  if (!payment || payment.webhookReceived || payment.status !== "PENDING") return;

  await prisma.payment.update({
    where: { id: payment.id },
    data: { webhookReceived: true, flutterwaveFlwRef: transId },
  });

  if (status === "SUCCESSFUL") {
    await creditVotes(payment);
    logger.info(`Fapshi webhook: votes credited txRef=${txRef}`);
  } else {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
  }
}

async function processCinetPayWebhook(body) {
  const { cpm_trans_id: txRef, cpm_result } = body;
  if (!txRef) return;

  const payment = await prisma.payment.findUnique({ where: { flutterwaveTxRef: txRef } });
  if (!payment || payment.webhookReceived || payment.status !== "PENDING") return;

  await prisma.payment.update({ where: { id: payment.id }, data: { webhookReceived: true } });

  if (cpm_result === "00") {
    await creditVotes(payment);
    logger.info(`CinetPay webhook: votes credited txRef=${txRef}`);
  } else {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
  }
}

async function processStripeWebhook(rawBody, signature) {
  const stripeClient = getStripe();
  let event;

  try {
    event = stripeClient.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    throw new AppError("Stripe webhook signature invalide", 400);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const txRef = session.client_reference_id || session.metadata?.txRef;
    if (!txRef) return;

    const payment = await prisma.payment.findUnique({ where: { flutterwaveTxRef: txRef } });
    if (!payment || payment.webhookReceived || payment.status !== "PENDING") return;

    await prisma.payment.update({ where: { id: payment.id }, data: { webhookReceived: true } });

    if (session.payment_status === "paid") {
      await creditVotes(payment);
      logger.info(`Stripe webhook: votes credited txRef=${txRef}`);
    }
  }
}

async function creditVotes(payment) {
  await prisma.$transaction(async (tx) => {
    await tx.payment.update({ where: { id: payment.id }, data: { status: "COMPLETED" } });
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
  });

  await emitRankingUpdate();
}

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
  processCinetPayWebhook,
  processStripeWebhook,
  getUserPayments,
  creditVotes,
};
