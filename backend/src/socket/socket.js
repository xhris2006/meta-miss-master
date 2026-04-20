const { Server } = require("socket.io");
const { PrismaClient } = require("@prisma/client");
const logger = require("../utils/logger");

const prisma = new PrismaClient();
let io = null;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    socket.on("join:ranking", () => {
      socket.join("ranking");
    });

    socket.on("disconnect", () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  logger.info("Socket.io initialized");
  return io;
}

async function emitRankingUpdate() {
  if (!io) return;

  try {
    const [miss, master] = await Promise.all([
      prisma.candidate.findMany({
        where: { status: "APPROVED", type: "MISS" },
        orderBy: { totalVotes: "desc" },
        take: 10,
        select: { id: true, name: true, photoUrl: true, city: true, totalVotes: true }
      }),
      prisma.candidate.findMany({
        where: { status: "APPROVED", type: "MASTER" },
        orderBy: { totalVotes: "desc" },
        take: 10,
        select: { id: true, name: true, photoUrl: true, city: true, totalVotes: true }
      })
    ]);

    io.to("ranking").emit("ranking:update", {
      miss: miss.map((c, i) => ({ ...c, rank: i + 1 })),
      master: master.map((c, i) => ({ ...c, rank: i + 1 })),
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    logger.error("Socket emit error:", err);
  }
}

module.exports = { initSocket, emitRankingUpdate };
