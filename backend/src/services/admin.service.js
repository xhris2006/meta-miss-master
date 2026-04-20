const { PrismaClient } = require("@prisma/client");
const { AppError } = require("../utils/errors");
const { emitRankingUpdate } = require("../socket/socket");

const prisma = new PrismaClient();

async function getAllCandidates({ status, page, limit }) {
  const skip = (page - 1) * limit;
  const where = {};
  if (status) where.status = status;

  const [candidates, total] = await Promise.all([
    prisma.candidate.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    }),
    prisma.candidate.count({ where })
  ]);
  return { candidates, total, page, totalPages: Math.ceil(total / limit) };
}

async function approveCandidate(id) {
  const candidate = await prisma.candidate.findUnique({ where: { id } });
  if (!candidate) throw new AppError("Candidat introuvable", 404);
  return prisma.candidate.update({ where: { id }, data: { status: "APPROVED" } });
}

async function rejectCandidate(id) {
  const candidate = await prisma.candidate.findUnique({ where: { id } });
  if (!candidate) throw new AppError("Candidat introuvable", 404);
  return prisma.candidate.update({ where: { id }, data: { status: "REJECTED" } });
}

async function deleteCandidate(id) {
  // Delete related votes first
  await prisma.vote.deleteMany({ where: { candidateId: id } });
  await prisma.candidate.delete({ where: { id } });
  await emitRankingUpdate();
}

async function getAllPayments({ status, page, limit }) {
  const skip = (page - 1) * limit;
  const where = {};
  if (status) where.status = status;

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    }),
    prisma.payment.count({ where })
  ]);
  return { payments, total, page, totalPages: Math.ceil(total / limit) };
}

async function refundPayment(id) {
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) throw new AppError("Paiement introuvable", 404);
  if (payment.status !== "COMPLETED") throw new AppError("Paiement non complété", 400);

  // Rollback votes
  await prisma.$transaction(async (tx) => {
    await tx.vote.deleteMany({ where: { paymentId: id } });
    await tx.candidate.update({
      where: { id: payment.candidateId },
      data: { totalVotes: { decrement: payment.votesCount } }
    });
    await tx.payment.update({ where: { id }, data: { status: "REFUNDED" } });
  });

  await emitRankingUpdate();
  return { id, status: "REFUNDED" };
}

async function deleteVote(id) {
  const vote = await prisma.vote.findUnique({ where: { id } });
  if (!vote) throw new AppError("Vote introuvable", 404);

  await prisma.$transaction(async (tx) => {
    await tx.candidate.update({
      where: { id: vote.candidateId },
      data: { totalVotes: { decrement: vote.count } }
    });
    await tx.vote.delete({ where: { id } });
  });

  await emitRankingUpdate();
}

async function getDashboardStats() {
  const [
    totalUsers, totalCandidates, pendingCandidates,
    completedPayments, pendingPayments, totalVotes, revenue
  ] = await Promise.all([
    prisma.user.count(),
    prisma.candidate.count({ where: { status: "APPROVED" } }),
    prisma.candidate.count({ where: { status: "PENDING" } }),
    prisma.payment.count({ where: { status: "COMPLETED" } }),
    prisma.payment.count({ where: { status: "PENDING" } }),
    prisma.vote.aggregate({ _sum: { count: true } }),
    prisma.payment.aggregate({ where: { status: "COMPLETED" }, _sum: { amount: true } })
  ]);

  return {
    totalUsers,
    totalCandidates,
    pendingCandidates,
    completedPayments,
    pendingPayments,
    totalVotes: totalVotes._sum.count || 0,
    revenue: revenue._sum.amount || 0
  };
}

async function getAllUsers({ page, limit }) {
  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    }),
    prisma.user.count()
  ]);
  return { users, total, page, totalPages: Math.ceil(total / limit) };
}

module.exports = {
  getAllCandidates, approveCandidate, rejectCandidate, deleteCandidate,
  getAllPayments, refundPayment, deleteVote, getDashboardStats, getAllUsers
};
