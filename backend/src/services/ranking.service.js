const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function getGlobalRanking(type) {
  const where = { status: "APPROVED" };
  if (type && ["MISS", "MASTER"].includes(type)) where.type = type;

  const candidates = await prisma.candidate.findMany({
    where,
    orderBy: { totalVotes: "desc" },
    select: { id: true, name: true, type: true, city: true, photoUrl: true, totalVotes: true }
  });

  return candidates.map((c, i) => ({ ...c, rank: i + 1 }));
}

async function getTopN(n, type) {
  const where = { status: "APPROVED" };
  if (type && ["MISS", "MASTER"].includes(type)) where.type = type;

  const candidates = await prisma.candidate.findMany({
    where,
    orderBy: { totalVotes: "desc" },
    take: n,
    select: { id: true, name: true, type: true, city: true, photoUrl: true, totalVotes: true }
  });

  return candidates.map((c, i) => ({ ...c, rank: i + 1 }));
}

async function getStats() {
  const [totalCandidates, totalVotes, totalPayments, recentVotes] = await Promise.all([
    prisma.candidate.count({ where: { status: "APPROVED" } }),
    prisma.vote.aggregate({ _sum: { count: true } }),
    prisma.payment.aggregate({
      where: { status: "COMPLETED" },
      _sum: { amount: true },
      _count: true
    }),
    prisma.vote.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        candidate: { select: { name: true, type: true } }
      }
    })
  ]);

  return {
    totalCandidates,
    totalVotesCount: totalVotes._sum.count || 0,
    totalRevenue: totalPayments._sum.amount || 0,
    totalTransactions: totalPayments._count,
    recentVotes
  };
}

module.exports = { getGlobalRanking, getTopN, getStats };
