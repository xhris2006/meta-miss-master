const { PrismaClient } = require("@prisma/client");
const { AppError } = require("../utils/errors");
const prisma = new PrismaClient();

async function create({ name, startDate, endDate }) {
  return prisma.contest.create({
    data: { name, startDate: new Date(startDate), endDate: endDate ? new Date(endDate) : null }
  });
}

async function closeContest(id) {
  const contest = await prisma.contest.findUnique({ where: { id } });
  if (!contest) throw new AppError("Concours introuvable", 404);
  return prisma.contest.update({ where: { id }, data: { status: "CLOSED", endDate: new Date() } });
}

async function openContest(id) {
  const contest = await prisma.contest.findUnique({ where: { id } });
  if (!contest) throw new AppError("Concours introuvable", 404);
  return prisma.contest.update({ where: { id }, data: { status: "OPEN" } });
}

async function getActive() {
  return prisma.contest.findFirst({ where: { status: "OPEN" }, orderBy: { createdAt: "desc" } });
}

module.exports = { create, closeContest, openContest, getActive };
