const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function getVotesByCandidate(candidateId) {
  return prisma.vote.findMany({
    where: { candidateId },
    orderBy: { createdAt: "desc" },
    select: { id: true, count: true, createdAt: true }
  });
}

async function getUserVotes(userId) {
  return prisma.vote.findMany({
    where: { userId },
    include: { candidate: { select: { id: true, name: true, type: true, photoUrl: true } } },
    orderBy: { createdAt: "desc" }
  });
}

module.exports = { getVotesByCandidate, getUserVotes };
