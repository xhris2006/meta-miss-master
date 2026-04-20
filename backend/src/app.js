const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");

const { globalRateLimiter } = require("./middlewares/rateLimiter");
const { errorHandler } = require("./middlewares/errorHandler");

// Routes
const authRoutes = require("./routes/auth.routes");
const candidateRoutes = require("./routes/candidate.routes");
const voteRoutes = require("./routes/vote.routes");
const paymentRoutes = require("./routes/payment.routes");
const rankingRoutes = require("./routes/ranking.routes");
const adminRoutes = require("./routes/admin.routes");
const contestRoutes = require("./routes/contest.routes");

const app = express();

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Logging
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Body parsing — MUST come before routes EXCEPT webhook which needs raw body
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Static uploads
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Global rate limiter
app.use("/api/", globalRateLimiter);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), env: process.env.NODE_ENV });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/candidates", candidateRoutes);
app.use("/api/votes", voteRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/ranking", rankingRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/contest", contestRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
