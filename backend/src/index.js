require("dotenv").config();
const http = require("http");
const app = require("./app");
const { initSocket } = require("./socket/socket");
const { PrismaClient } = require("@prisma/client");
const logger = require("./utils/logger");

const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

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
