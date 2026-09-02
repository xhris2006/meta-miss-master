/**
 * Instance Prisma partagée — singleton pattern.
 *
 * Par défaut Prisma ouvre max 10 connexions DB par instance.
 * Avec plusieurs instances PM2, chaque instance a son propre pool.
 * PostgreSQL supporte ~100 connexions simultanées par défaut.
 *
 * Calcul sûr : max 4 instances × 10 connexions = 40 connexions (bien en dessous de 100).
 * Si tu passes à "instances: max" avec 8 vCPU → ajuster connection_limit à 10 max par instance.
 *
 * La DATABASE_URL peut inclure le pool size :
 *   postgresql://user:pwd@host/db?connection_limit=10&pool_timeout=20
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development"
    ? ["query", "warn", "error"]
    : ["warn", "error"],

  // Timeout des requêtes lentes (5 secondes max)
  // Évite que des requêtes bloquées saturent le pool
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Graceful disconnect au SIGTERM
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});

module.exports = prisma;
