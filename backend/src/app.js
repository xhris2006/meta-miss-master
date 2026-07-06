const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const { globalRateLimiter } = require("./middlewares/rateLimiter");
const { errorHandler } = require("./middlewares/errorHandler");
const passport = require("./config/passport");

// Routes
const authRoutes = require("./routes/auth.routes");
const candidateRoutes = require("./routes/candidate.routes");
const voteRoutes = require("./routes/vote.routes");
const paymentRoutes = require("./routes/payment.routes");
const rankingRoutes = require("./routes/ranking.routes");
const adminRoutes = require("./routes/admin.routes");
const contestRoutes = require("./routes/contest.routes");
const socialRoutes = require("./routes/social.routes");
const settingsRoutes = require("./routes/settings.routes");

const app = express();
// SÉCURITÉ : nombre de proxys de confiance configurable selon l'infra réelle
// (Railway = 1 ; Cloudflare + Railway = 2). Un mauvais réglage permet le spoof
// de X-Forwarded-For et le contournement des rate-limits. Défaut : 1.
app.set("trust proxy", Number(process.env.TRUST_PROXY ?? 1));

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(passport.initialize());

// CORS
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://metavote.online",
  "https://www.metavote.online",
  "https://meta-miss-master.vercel.app",
  "http://localhost:3000",
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Autoriser les requêtes sans origin (ex: Postman, mobile)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS bloqué pour l'origine: ${origin}`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Logging
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// ─── Body parsing ──────────────────────────────────────────────────────────────
// IMPORTANT : les routes webhook ont besoin du raw body pour vérifier la
// signature HMAC. On exclut /api/payments/webhook/* du parsing JSON global
// pour que express.raw() dans payment.routes.js reçoive le Buffer intact.
app.use((req, res, next) => {
  if (req.path.startsWith("/api/payments/webhook/")) {
    return next(); // raw body géré dans la route elle-même
  }
  // Limite réduite : les JSON métier sont petits (les photos passent par multer).
  express.json({ limit: "256kb" })(req, res, next);
});
app.use((req, res, next) => {
  if (req.path.startsWith("/api/payments/webhook/")) {
    return next();
  }
  express.urlencoded({ extended: true, limit: "10mb" })(req, res, next);
});

// Static uploads
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Global rate limiter
app.use("/api/", globalRateLimiter);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), env: process.env.NODE_ENV });
});
app.get("/api/health", (req, res) => {
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
app.use("/api/social-links", socialRoutes);
app.use("/api/settings", settingsRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
