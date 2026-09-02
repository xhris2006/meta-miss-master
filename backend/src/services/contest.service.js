const { PrismaClient } = require("@prisma/client");
const { AppError } = require("../utils/errors");
const prisma = new PrismaClient();

async function create({ name, startDate, endDate }) {
  // Fermer tous les concours ouverts avant d'en créer un nouveau
  await prisma.contest.updateMany({ where: { status: "OPEN" }, data: { status: "CLOSED" } });
  return prisma.contest.create({
    data: { name, startDate: new Date(startDate), endDate: endDate ? new Date(endDate) : null, status: "OPEN" }
  });
}

async function updateContest(id, { name, startDate, endDate }) {
  const contest = await prisma.contest.findUnique({ where: { id } });
  if (!contest) throw new AppError("Concours introuvable", 404);
  return prisma.contest.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
    }
  });
}

async function closeContest(id) {
  const contest = await prisma.contest.findUnique({ where: { id } });
  if (!contest) throw new AppError("Concours introuvable", 404);
  return prisma.contest.update({ where: { id }, data: { status: "CLOSED" } });
}

async function openContest(id) {
  // Fermer les autres concours ouverts d'abord
  await prisma.contest.updateMany({ where: { status: "OPEN" }, data: { status: "CLOSED" } });
  const contest = await prisma.contest.findUnique({ where: { id } });
  if (!contest) throw new AppError("Concours introuvable", 404);
  return prisma.contest.update({ where: { id }, data: { status: "OPEN" } });
}

async function getAll() {
  return prisma.contest.findMany({ orderBy: { createdAt: "desc" } });
}

async function getActive() {
  return prisma.contest.findFirst({ where: { status: "OPEN" }, orderBy: { createdAt: "desc" } });
}

module.exports = { create, updateContest, closeContest, openContest, getActive, getAll };
