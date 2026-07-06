const prisma = require("../utils/prismaClient");
const cache = require("./cache");


const RANKING_TTL   = 5;   // classement : cache 5 secondes (live updates)
const STATS_TTL     = 30;  // stats admin : cache 30 secondes
const TOP_TTL       = 10;  // top candidats home : cache 10 secondes

async function getGlobalRanking(type) {
  const key = `ranking:${type || "ALL"}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const where = { status: "APPROVED" };
  if (type && ["MISS", "MASTER"].includes(type)) where.type = type;

  const candidates = await prisma.candidate.findMany({
    where,
    // Tri par votes ; départage par points cumulés (utile juste après la remise
    // à zéro des votes de 21h, où tous les votes valent 0).
    orderBy: [{ totalVotes: "desc" }, { points: "desc" }],
    select: { id: true, name: true, type: true, city: true, photoUrl: true, totalVotes: true, points: true }
  });

  const result = candidates.map((c, i) => ({ ...c, rank: i + 1 }));
  cache.set(key, result, RANKING_TTL);
  return result;
}

async function getTopN(n, type) {
  const key = `top:${n}:${type || "ALL"}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const where = { status: "APPROVED" };
  if (type && ["MISS", "MASTER"].includes(type)) where.type = type;

  const candidates = await prisma.candidate.findMany({
    where,
    orderBy: [{ totalVotes: "desc" }, { points: "desc" }],
    take: n,
    select: { id: true, name: true, type: true, city: true, photoUrl: true, totalVotes: true, points: true }
  });

  const result = candidates.map((c, i) => ({ ...c, rank: i + 1 }));
  cache.set(key, result, TOP_TTL);
  return result;
}

// SÉCURITÉ : stats PUBLIQUES uniquement. On n'expose JAMAIS le chiffre
// d'affaires, le nombre de transactions ni le détail des votes récents ici
// (route /api/ranking/stats sans auth). Les stats sensibles restent dans
// l'espace admin (adminService.getDashboardStats, protégé par requireAdmin).
async function getStats() {
  const key = "stats:public";
  const cached = cache.get(key);
  if (cached) return cached;

  const [totalCandidates, totalVotes] = await Promise.all([
    prisma.candidate.count({ where: { status: "APPROVED" } }),
    prisma.vote.aggregate({ _sum: { count: true } }),
  ]);

  const result = {
    totalCandidates,
    totalVotesCount: totalVotes._sum.count || 0,
  };

  cache.set(key, result, STATS_TTL);
  return result;
}

/** Invalide tout le cache ranking — appelé après chaque vote crédité */
function invalidateRankingCache() {
  cache.delPattern("ranking:");
  cache.delPattern("top:");
  cache.delPattern("stats:");
}

module.exports = { getGlobalRanking, getTopN, getStats, invalidateRankingCache };
