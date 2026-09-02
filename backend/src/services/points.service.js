const prisma = require("../utils/prismaClient");
const logger = require("../utils/logger");
const { invalidateRankingCache } = require("./ranking.service");
const { emitRankingUpdate } = require("../socket/socket");
const settingsService = require("./settings.service");

// Barème par défaut : #1 = 100, #2 = 90, … #10 = 10. L'admin peut le modifier
// chaque jour via PUT /admin/points/config (stocké dans les réglages du site) ;
// l'attribution du soir lit le barème enregistré au moment où elle s'exécute.
const POINTS_BY_RANK = settingsService.DEFAULT_POINTS_BY_RANK;

// Le Cameroun est en UTC+1 (WAT, pas de changement d'heure). La "journée locale"
// bascule à minuit heure du Cameroun.
const CAMEROON_OFFSET_MS = 1 * 60 * 60 * 1000;

/** Clé de jour "YYYY-MM-DD" en heure du Cameroun (sert de verrou d'idempotence). */
function cameroonDayKey(date = new Date()) {
  const local = new Date(date.getTime() + CAMEROON_OFFSET_MS);
  return local.toISOString().slice(0, 10);
}

/**
 * Attribue les points du jour selon le classement (top 10 par votes), puis
 * REMET LES VOTES À ZÉRO pour repartir sur une nouvelle manche le lendemain.
 *
 * Idempotent : un seul passage par jour local Cameroun (verrou PointsAward.day),
 * sauf `force: true`. Sûr à rejouer après un redémarrage serveur.
 */
async function awardDailyPoints({ force = false, day = cameroonDayKey() } = {}) {
  // Verrou quotidien : on ne ré-attribue pas si le jour est déjà traité.
  if (!force) {
    const existing = await prisma.pointsAward.findUnique({ where: { day } });
    if (existing) {
      return { alreadyAwarded: true, day, awarded: existing.detail || [], votesReset: false };
    }
  }

  // Barème du jour (configuré par l'admin, défaut 100 → 10).
  const scale = await settingsService.getPointsScale();

  // Classement du jour : approuvés, triés par votes (départage : points, puis ancienneté).
  const top = await prisma.candidate.findMany({
    where: { status: "APPROVED" },
    orderBy: [{ totalVotes: "desc" }, { points: "desc" }, { createdAt: "asc" }],
    take: scale.length,
    select: { id: true, name: true, totalVotes: true },
  });

  const awarded = top.map((c, i) => ({
    candidateId: c.id,
    name: c.name,
    rank: i + 1,
    points: scale[i],
    votes: c.totalVotes,
  }));

  const deletedVotes = await prisma.$transaction(async (tx) => {
    // 1. Créditer les points du top 10 (cumulatifs).
    for (const a of awarded) {
      await tx.candidate.update({
        where: { id: a.candidateId },
        data: { points: { increment: a.points } },
      });
    }
    // 2. Remise à zéro des votes (nouvelle manche) — même logique que resetAllVotes.
    const del = await tx.vote.deleteMany({});
    await tx.candidate.updateMany({ data: { totalVotes: 0 } });
    // 3. Marquer le jour comme traité (idempotence + audit).
    await tx.pointsAward.upsert({
      where: { day },
      update: { detail: awarded },
      create: { day, detail: awarded },
    });
    return del.count;
  });

  invalidateRankingCache();
  await emitRankingUpdate();
  logger.info(
    `Points du jour attribués (${day}) : ${awarded.length} candidat(s) crédité(s), ` +
    `${deletedVotes} vote(s) remis à zéro`
  );

  return { alreadyAwarded: false, day, awarded, votesReset: true, deletedVotes };
}

/** Dernière attribution enregistrée (pour l'affichage admin). */
async function getLastAward() {
  return prisma.pointsAward.findFirst({ orderBy: { createdAt: "desc" } });
}

module.exports = { awardDailyPoints, getLastAward, cameroonDayKey, POINTS_BY_RANK };
