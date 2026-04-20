const { PrismaClient } = require("@prisma/client");
const { AppError } = require("../utils/errors");
const path = require("path");
const fs = require("fs");

const prisma = new PrismaClient();

async function createCandidate({ name, type, age, city, bio, photoPath }) {
  if (!["MISS", "MASTER"].includes(type)) {
    throw new AppError("Type invalide. Choisissez MISS ou MASTER", 400);
  }
  if (age < 16 || age > 35) {
    throw new AppError("L'âge doit être entre 16 et 35 ans", 400);
  }

  const photoUrl = `/uploads/${photoPath}`;

  return prisma.candidate.create({
    data: { name, type, age: +age, city, bio, photoUrl, status: "PENDING" }
  });
}

async function getAllApproved({ type, page, limit }) {
  const skip = (page - 1) * limit;
  const where = { status: "APPROVED" };
  if (type && ["MISS", "MASTER"].includes(type)) where.type = type;

  const [candidates, total] = await Promise.all([
    prisma.candidate.findMany({
      where,
      orderBy: { totalVotes: "desc" },
      skip,
      take: limit
    }),
    prisma.candidate.count({ where })
  ]);

  return { candidates, total, page, totalPages: Math.ceil(total / limit) };
}

async function getById(id) {
  const candidate = await prisma.candidate.findFirst({
    where: { id, status: "APPROVED" },
    include: {
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
  const where = { status: "APPROVED" };
  if (type && ["MISS", "MASTER"].includes(type)) where.type = type;

  return prisma.candidate.findMany({
    where,
    orderBy: { totalVotes: "desc" },
    take: limit
  });
}

module.exports = { createCandidate, getAllApproved, getById, getTop };
