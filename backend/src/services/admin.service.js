const { PrismaClient } = require("@prisma/client");
const { AppError } = require("../utils/errors");
const { emitRankingUpdate } = require("../socket/socket");
const { invalidateRankingCache } = require("./ranking.service");

const prisma = new PrismaClient();
const VALID_CANDIDATE_STATUSES = ["PENDING", "APPROVED", "REJECTED"];
const VALID_PAYMENT_STATUSES = ["PENDING", "COMPLETED", "FAILED", "REFUNDED"];
const VALID_TYPES = ["MISS", "MASTER"];
// Code exigé pour ajuster manuellement les votes d'un candidat (surchargeable par env)
const VOTES_ADJUST_CODE = process.env.ADMIN_VOTES_CODE || "180805";

function normalizePagination(page, limit, defaultPage = 1, defaultLimit = 20) {
  const normalizedPage = Number.isInteger(+page) && +page > 0 ? +page : defaultPage;
  const normalizedLimit = Number.isInteger(+limit) && +limit > 0 ? +limit : defaultLimit;
  return { page: normalizedPage, limit: normalizedLimit };
}

async function getAllCandidates({ status, page, limit }) {
  const { page: safePage, limit: safeLimit } = normalizePagination(page, limit);
  const skip = (safePage - 1) * safeLimit;
  const where = {};

  if (status) {
    const normalizedStatus = String(status).toUpperCase();
    if (normalizedStatus !== "ALL") {
      if (!VALID_CANDIDATE_STATUSES.includes(normalizedStatus)) {
        throw new AppError("Status de candidat invalide", 400);
      }
      where.status = normalizedStatus;
    }
  }

  const [candidates, total] = await Promise.all([
    prisma.candidate.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: safeLimit
    }),
    prisma.candidate.count({ where })
  ]);
  return { candidates, total, page: safePage, totalPages: Math.ceil(total / safeLimit) };
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
  await prisma.vote.deleteMany({ where: { candidateId: id } });
  await prisma.candidate.delete({ where: { id } });
  await emitRankingUpdate();
}

async function getAllPayments({ status, page, limit }) {
  const { page: safePage, limit: safeLimit } = normalizePagination(page, limit);
  const skip = (safePage - 1) * safeLimit;
  const where = {};

  if (status) {
    const normalizedStatus = String(status).toUpperCase();
    if (normalizedStatus !== "ALL") {
      if (!VALID_PAYMENT_STATUSES.includes(normalizedStatus)) {
        throw new AppError("Status de paiement invalide", 400);
      }
      where.status = normalizedStatus;
    }
  }

  const [rawPayments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } }
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: safeLimit
    }),
    prisma.payment.count({ where })
  ]);

  // Resolve candidate names without requiring a schema relation on Payment.
  const candidateIds = [...new Set(rawPayments.map((p) => p.candidateId).filter(Boolean))];
  const candidateNameById = {};
  if (candidateIds.length) {
    const cands = await prisma.candidate.findMany({
      where: { id: { in: candidateIds } },
      select: { id: true, name: true }
    });
    cands.forEach((c) => { candidateNameById[c.id] = c.name; });
  }

  const payments = rawPayments.map((p) => ({
    ...p,
    candidateName: candidateNameById[p.candidateId] || null
  }));

  return { payments, total, page: safePage, totalPages: Math.ceil(total / safeLimit) };
}

async function refundPayment(id) {
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) throw new AppError("Paiement introuvable", 404);
  if (payment.status !== "COMPLETED") throw new AppError("Paiement non complété", 400);

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

// ── Reset: remet TOUS les votes à zéro ─────────────────────────────────────────
// Supprime tous les votes et remet totalVotes=0 sur chaque candidat.
// Les paiements (historique) sont conservés.
async function resetAllVotes() {
  const deletedVotes = await prisma.$transaction(async (tx) => {
    const deleted = await tx.vote.deleteMany({});
    await tx.candidate.updateMany({ data: { totalVotes: 0 } });
    return deleted.count;
  });

  invalidateRankingCache();   // vider le cache classement/stats
  await emitRankingUpdate();  // pousser le nouveau classement en temps réel

  return { deletedVotes };
}

// ── Ajustement manuel des votes (protégé par code) ─────────────────────────────
// delta > 0 : ajoute des votes · delta < 0 : en retire (le total ne descend pas sous 0).
// Le code est vérifié ici, côté serveur : sans code correct, aucun ajustement.
async function adjustCandidateVotes(id, { delta, code }) {
  if (String(code || "").trim() !== VOTES_ADJUST_CODE) {
    throw new AppError("Code de validation incorrect", 403);
  }
  const parsed = +delta;
  if (!Number.isInteger(parsed) || parsed === 0) {
    throw new AppError("Le nombre de votes doit être un entier non nul", 400);
  }
  const candidate = await prisma.candidate.findUnique({ where: { id } });
  if (!candidate) throw new AppError("Candidat introuvable", 404);
  if (candidate.status !== "APPROVED") {
    throw new AppError("Seuls les candidats approuvés peuvent voir leurs votes ajustés", 400);
  }

  const newTotal = Math.max(0, (candidate.totalVotes || 0) + parsed);
  const updated = await prisma.candidate.update({
    where: { id },
    data: { totalVotes: newTotal }
  });

  invalidateRankingCache();   // vider le cache classement/stats
  await emitRankingUpdate();  // pousser le nouveau classement en temps réel

  return updated;
}

// ── updateCandidate — supporte maintenant photoUrl ─────────────────────────────
async function updateCandidate(id, { name, city, age, bio, type, status, photoUrl, instagram, tiktok, snap, whatsappFan, phone }) {
  const candidate = await prisma.candidate.findUnique({ where: { id } });
  if (!candidate) throw new AppError("Candidat introuvable", 404);

  const updateData = {};
  if (name !== undefined) updateData.name = String(name).trim();
  if (city !== undefined) updateData.city = String(city).trim();
  if (age !== undefined) {
    const parsedAge = +age;
    if (!Number.isInteger(parsedAge) || parsedAge < 16 || parsedAge > 35) {
      throw new AppError("L'âge doit être un entier entre 16 et 35 ans", 400);
    }
    updateData.age = parsedAge;
  }
  if (bio !== undefined) updateData.bio = bio;
  if (type !== undefined) {
    if (!VALID_TYPES.includes(type)) {
      throw new AppError("Type de candidat invalide", 400);
    }
    updateData.type = type;
  }
  if (status !== undefined) {
    if (!VALID_CANDIDATE_STATUSES.includes(status)) {
      throw new AppError("Status de candidat invalide", 400);
    }
    updateData.status = status;
  }
  // Mise à jour de la photo si fournie (URL Cloudinary)
  if (photoUrl !== undefined && photoUrl !== "") {
    updateData.photoUrl = photoUrl;
  }
  // Réseaux sociaux
  if (instagram !== undefined) updateData.instagram = instagram || null;
  if (tiktok !== undefined) updateData.tiktok = tiktok || null;
  if (snap !== undefined) updateData.snap = snap || null;
  if (whatsappFan !== undefined) updateData.whatsappFan = whatsappFan || null;
  if (phone !== undefined) updateData.phone = phone || null;

  return prisma.candidate.update({
    where: { id },
    data: updateData
  });
}

// ── Réconciliation des paiements ────────────────────────────────────────────
// Re-vérifie auprès des fournisseurs (Fapshi, GeniusPay, KPay, PayPal) tous les
// paiements encore PENDING : si le fournisseur confirme le succès, les votes
// sont crédités (via verifyPayment, qui est idempotent). Sert à rattraper les
// transactions payées dont le webhook ne serait jamais arrivé.
//
// Chaque paiement est revérifié auprès de l'API de son fournisseur (appel réseau
// lent). On traite donc un LOT BORNÉ par appel pour que la requête HTTP réponde
// toujours vite (sinon le client dépasse son timeout) : l'admin peut relancer
// le bouton autant de fois que nécessaire jusqu'à ce que `remaining` = 0.
//
// withinDays : ne re-vérifie que les paiements des N derniers jours (défaut 7).
// max        : taille du lot traité à cet appel (défaut 40, plafond 100).
async function reconcilePendingPayments({ withinDays = 7, max = 40 } = {}) {
  // Import tardif pour éviter tout cycle de require au chargement des modules.
  const paymentService = require("./payment.service");

  const days = Number.isInteger(+withinDays) && +withinDays > 0 ? +withinDays : 7;
  const cap = Number.isInteger(+max) && +max > 0 ? Math.min(+max, 100) : 40;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const where = { status: "PENDING", createdAt: { gte: since } };

  // Nombre total en attente (avant traitement) → permet d'indiquer s'il reste
  // des paiements à traiter après ce lot.
  const totalPending = await prisma.payment.count({ where });

  const pending = await prisma.payment.findMany({
    where,
    orderBy: { createdAt: "asc" }, // les plus anciens d'abord (les plus susceptibles d'être bloqués)
    take: cap,
    select: { id: true, flutterwaveTxRef: true, votesCount: true },
  });

  const summary = {
    totalPending,       // total en attente au début
    checked: 0,
    credited: 0,        // paiements passés PENDING → COMPLETED
    stillPending: 0,
    failed: 0,
    errors: 0,
    votesAdded: 0,
    remaining: 0,       // restant à traiter → relancer le bouton si > 0
  };

  // Séquentiel : on évite de marteler les API des fournisseurs.
  for (const p of pending) {
    if (!p.flutterwaveTxRef) { summary.errors++; continue; }
    summary.checked++;
    try {
      const res = await paymentService.verifyPayment(p.flutterwaveTxRef);
      if (res.status === "COMPLETED") {
        summary.credited++;
        summary.votesAdded += res.votesCount || p.votesCount || 0;
      } else if (res.status === "FAILED") {
        summary.failed++;
      } else {
        summary.stillPending++;
      }
    } catch (err) {
      summary.errors++;
    }
  }

  // Ceux qui étaient au-delà du lot ET ceux encore PENDING après vérification
  // restent à traiter à la prochaine relance.
  summary.remaining = Math.max(0, totalPending - summary.credited - summary.failed);

  return summary;
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
  const { page: safePage, limit: safeLimit } = normalizePagination(page, limit);
  const skip = (safePage - 1) * safeLimit;
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: safeLimit
    }),
    prisma.user.count()
  ]);
  return { users, total, page: safePage, totalPages: Math.ceil(total / safeLimit) };
}

module.exports = {
  getAllCandidates, approveCandidate, rejectCandidate, updateCandidate, deleteCandidate,
  adjustCandidateVotes,
  getAllPayments, refundPayment, deleteVote, resetAllVotes, reconcilePendingPayments,
  getDashboardStats, getAllUsers
};
