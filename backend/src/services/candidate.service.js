const { PrismaClient } = require("@prisma/client");
const { AppError } = require("../utils/errors");

const prisma = new PrismaClient();
const VALID_TYPES = ["MISS", "MASTER"];

// SÉCURITÉ : champs exposés publiquement. On EXCLUT `phone` (numéro privé de la
// candidate) et `userId` des réponses publiques pour éviter toute fuite de PII.
const PUBLIC_CANDIDATE_SELECT = {
  id: true,
  name: true,
  type: true,
  age: true,
  city: true,
  bio: true,
  photoUrl: true,
  status: true,
  totalVotes: true,
  totalLikes: true,
  points: true,
  instagram: true,
  tiktok: true,
  snap: true,
  whatsappFan: true,
  createdAt: true,
};

function normalizePagination(page, limit, defaultPage = 1, defaultLimit = 20) {
  const normalizedPage = Number.isInteger(+page) && +page > 0 ? +page : defaultPage;
  const normalizedLimit = Number.isInteger(+limit) && +limit > 0 ? +limit : defaultLimit;
  return { page: normalizedPage, limit: normalizedLimit };
}

async function createCandidate({ name, type, age, city, bio, photoPath, instagram, tiktok, snap, whatsappFan, phone, userId }) {
  if (!["MISS", "MASTER"].includes(type)) {
    throw new AppError("Type invalide. Choisissez MISS ou MASTER", 400);
  }
  if (age < 16 || age > 35) {
    throw new AppError("L'âge doit être entre 16 et 35 ans", 400);
  }

  const photoUrl = photoPath;

  return prisma.candidate.create({
    data: {
      name,
      type,
      age: +age,
      city,
      bio,
      photoUrl,
      status: "PENDING",
      totalLikes: 0,
      instagram: instagram?.trim() || null,
      tiktok: tiktok?.trim() || null,
      snap: snap?.trim() || null,
      whatsappFan: whatsappFan?.trim() || null,
      phone: phone?.trim() || null,
      userId: userId || undefined,
    }
  });
}

async function getAllApproved({ type, page, limit }) {
  const { page: safePage, limit: safeLimit } = normalizePagination(page, limit);
  const skip = (safePage - 1) * safeLimit;
  const where = { status: "APPROVED" };

  if (type && VALID_TYPES.includes(type)) {
    where.type = type;
  }

  const [candidates, total] = await Promise.all([
    prisma.candidate.findMany({
      where,
      orderBy: { totalVotes: "desc" },
      skip,
      take: safeLimit,
      select: PUBLIC_CANDIDATE_SELECT,
    }),
    prisma.candidate.count({ where })
  ]);

  return { candidates, total, page: safePage, totalPages: Math.ceil(total / safeLimit) };
}

async function getById(id) {
  const candidate = await prisma.candidate.findFirst({
    where: { id, status: "APPROVED" },
    select: {
      ...PUBLIC_CANDIDATE_SELECT,
      votes: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { count: true, createdAt: true }
      }
    }
  });
  return candidate;
}

async function getTop({ type, limit }) {
  const { limit: safeLimit } = normalizePagination(1, limit, 1, 10);
  const where = { status: "APPROVED" };
  if (type && VALID_TYPES.includes(type)) {
    where.type = type;
  }

  return prisma.candidate.findMany({
    where,
    orderBy: { totalVotes: "desc" },
    take: safeLimit,
    select: PUBLIC_CANDIDATE_SELECT,
  });
}

module.exports = { createCandidate, getAllApproved, getById, getTop };
