require("dotenv").config();
const http = require("http");
const app = require("./app");
const { initSocket } = require("./socket/socket");
const { startPointsScheduler } = require("./scheduler");
const logger = require("./utils/logger");
const prisma = require("./utils/prismaClient");

const PORT = process.env.PORT || 5000;

// ── SÉCURITÉ : validation des secrets au démarrage ──────────────────────────
// Empêche de tourner en production avec des secrets JWT faibles/par défaut
// (sinon un attaquant peut forger un token admin).
function validateSecrets() {
  const WEAK = [
    "your_jwt_secret_min_32_chars",
    "your_refresh_secret_min_32_chars_different",
  ];
  const checks = [
    ["JWT_SECRET", process.env.JWT_SECRET],
    ["JWT_REFRESH_SECRET", process.env.JWT_REFRESH_SECRET],
  ];

  const problems = [];
  for (const [name, value] of checks) {
    if (!value) problems.push(`${name} manquant`);
    else if (value.length < 32) problems.push(`${name} trop court (< 32 caractères)`);
    else if (WEAK.includes(value)) problems.push(`${name} = valeur d'exemple par défaut`);
  }
  if (process.env.JWT_SECRET && process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET) {
    problems.push("JWT_SECRET et JWT_REFRESH_SECRET doivent être différents");
  }

  if (problems.length) {
    const msg = `Configuration des secrets invalide : ${problems.join(" ; ")}. ` +
      `Générez-les avec « openssl rand -hex 32 ».`;
    if (process.env.NODE_ENV === "production") {
      logger.error("❌ " + msg);
      process.exit(1);
    } else {
      logger.warn("⚠️  " + msg);
    }
  }
}
validateSecrets();

const server = http.createServer(app);
initSocket(server);

async function main() {
  try {
    await prisma.$connect();
    logger.info("✅ Database connected");

    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📡 WebSocket ready`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);
    });

    // Planificateur : attribution quotidienne des points à 21h00 (Cameroun).
    startPointsScheduler();
  } catch (error) {
    logger.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  logger.info("Server gracefully stopped");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

main();
