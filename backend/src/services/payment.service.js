const { PrismaClient } = require("@prisma/client");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const { AppError } = require("../utils/errors");
const logger = require("../utils/logger");
const { emitRankingUpdate } = require("../socket/socket");

const prisma = new PrismaClient();

const FLW_BASE_URL = "https://api.flutterwave.com/v3";
const VOTE_PRICE = 100; // 100 FCFA per vote

function getFlwHeaders() {
  return {
    Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
    "Content-Type": "application/json"
  };
}

/**
 * Calculate number of votes from amount
 */
function amountToVotes(amount) {
  return Math.floor(amount / VOTE_PRICE);
}

/**
 * Initialize a Flutterwave payment
 */
async function initializePayment({ userId, candidateId, amount, userEmail, userName, userPhone }) {
  // Check contest is open
  const contest = await prisma.contest.findFirst({ where: { status: "OPEN" } });
  if (!contest) throw new AppError("Les votes sont actuellement fermés", 403);

  // Check candidate exists and is approved
  const candidate = await prisma.candidate.findFirst({
    where: { id: candidateId, status: "APPROVED" }
  });
  if (!candidate) throw new AppError("Candidat introuvable ou non approuvé", 404);

  const votesCount = amountToVotes(amount);
  if (votesCount < 1) throw new AppError("Montant insuffisant pour obtenir des votes", 400);

  // Generate unique tx_ref
  const txRef = `MMM-${uuidv4()}`;

  // Create pending payment record first (idempotency)
  const payment = await prisma.payment.create({
    data: {
      userId,
      candidateId,
      amount,
      votesCount,
      flutterwaveTxRef: txRef,
      status: "PENDING",
      metadata: { candidateName: candidate.name, candidateType: candidate.type }
    }
  });

  // Call Flutterwave API
  const payload = {
    tx_ref: txRef,
    amount,
    currency: "XAF",
    redirect_url: `${process.env.FRONTEND_URL}/vote/callback`,
    meta: {
      payment_id: payment.id,
      candidate_id: candidateId,
      votes_count: votesCount
    },
    customer: {
      email: userEmail,
      name: userName,
      phonenumber: userPhone || ""
    },
    customizations: {
      title: "META MISS & MASTER",
      description: `${votesCount} vote(s) pour ${candidate.name}`,
      logo: `${process.env.FRONTEND_URL}/logo.png`
    },
    payment_options: "mobilemoneyfranco,card"
  };

  try {
    const response = await axios.post(`${FLW_BASE_URL}/payments`, payload, { headers: getFlwHeaders() });

    if (response.data.status !== "success") {
      throw new AppError("Erreur Flutterwave: " + response.data.message, 502);
    }

    logger.info(`Payment initialized: txRef=${txRef}, amount=${amount}, votes=${votesCount}`);

    return {
      paymentId: payment.id,
      txRef,
      paymentLink: response.data.data.link,
      votesCount,
      amount,
      candidateName: candidate.name
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error("Flutterwave init error:", err.response?.data || err.message);
    throw new AppError("Erreur lors de l'initialisation du paiement", 502);
  }
}

/**
 * Verify payment status manually (frontend polling / redirect)
 */
async function verifyPayment(txRef, userId) {
  const payment = await prisma.payment.findUnique({ where: { flutterwaveTxRef: txRef } });
  if (!payment) throw new AppError("Transaction introuvable", 404);
  if (payment.userId !== userId) throw new AppError("Non autorisé", 403);

  // If already processed, return current status
  if (payment.status === "COMPLETED") {
    return { status: "COMPLETED", votesCount: payment.votesCount, message: "Votes déjà crédités" };
  }

  if (payment.status === "FAILED") {
    return { status: "FAILED", message: "Paiement échoué" };
  }

  // Query Flutterwave to verify
  try {
    const response = await axios.get(
      `${FLW_BASE_URL}/transactions/verify_by_reference?tx_ref=${txRef}`,
      { headers: getFlwHeaders() }
    );

    const flwData = response.data.data;
    if (response.data.status === "success" && flwData.status === "successful") {
      // Validate amount
      if (Math.floor(flwData.amount) < Math.floor(payment.amount)) {
        logger.warn(`Amount mismatch: expected=${payment.amount}, got=${flwData.amount}`);
        await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
        return { status: "FAILED", message: "Montant incorrect" };
      }
      // Credit votes
      await creditVotes(payment, flwData);
      return { status: "COMPLETED", votesCount: payment.votesCount, message: "Votes crédités avec succès!" };
    }

    return { status: payment.status, message: "Paiement en attente" };
  } catch (err) {
    logger.error("Verify payment error:", err.message);
    return { status: "PENDING", message: "Vérification impossible pour l'instant" };
  }
}

/**
 * Process Flutterwave webhook
 */
async function processWebhook(payload) {
  const { event, data } = payload;

  if (event !== "charge.completed") {
    logger.info(`Webhook: ignoring event ${event}`);
    return;
  }

  const { tx_ref, status, amount, id: flwTransId, flw_ref } = data;

  const payment = await prisma.payment.findUnique({ where: { flutterwaveTxRef: tx_ref } });
  if (!payment) {
    logger.warn(`Webhook: payment not found for tx_ref=${tx_ref}`);
    return;
  }

  // Anti double processing
  if (payment.webhookReceived) {
    logger.warn(`Webhook: duplicate received for tx_ref=${tx_ref}`);
    return;
  }

  // Mark webhook as received immediately
  await prisma.payment.update({
    where: { id: payment.id },
    data: { webhookReceived: true, flutterwaveFlwRef: flw_ref, flutterwaveTransId: String(flwTransId) }
  });

  if (status !== "successful") {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    logger.info(`Webhook: payment failed tx_ref=${tx_ref}`);
    return;
  }

  // Validate amount
  if (Math.floor(amount) < Math.floor(payment.amount)) {
    logger.warn(`Webhook amount mismatch: expected=${payment.amount}, received=${amount}`);
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    return;
  }

  // Only credit if still pending (avoid double credit if verify was called first)
  if (payment.status !== "PENDING") {
    logger.info(`Webhook: payment already processed tx_ref=${tx_ref}, status=${payment.status}`);
    return;
  }

  await creditVotes(payment, data);
  logger.info(`Webhook: votes credited tx_ref=${tx_ref}, votes=${payment.votesCount}`);
}

/**
 * Core vote crediting logic (atomic)
 */
async function creditVotes(payment, flwData) {
  await prisma.$transaction(async (tx) => {
    // Update payment to COMPLETED
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "COMPLETED",
        flutterwaveFlwRef: flwData.flw_ref || payment.flutterwaveFlwRef,
        flutterwaveTransId: flwData.id ? String(flwData.id) : payment.flutterwaveTransId
      }
    });

    // Create vote record
    await tx.vote.create({
      data: {
        userId: payment.userId,
        candidateId: payment.candidateId,
        count: payment.votesCount,
        paymentId: payment.id
      }
    });

    // Update candidate vote count
    await tx.candidate.update({
      where: { id: payment.candidateId },
      data: { totalVotes: { increment: payment.votesCount } }
    });
  });

  // Emit real-time update
  await emitRankingUpdate();
}

async function getUserPayments(userId, page, limit) {
  const skip = (page - 1) * limit;
  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where: { userId },
      include: { votes: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    }),
    prisma.payment.count({ where: { userId } })
  ]);
  return { payments, total, page, totalPages: Math.ceil(total / limit) };
}

module.exports = { initializePayment, verifyPayment, processWebhook, getUserPayments };
