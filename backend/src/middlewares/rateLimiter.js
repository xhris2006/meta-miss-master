const rateLimit = require("express-rate-limit");

/**
 * Compteurs en mémoire — fonctionne sur une instance.
 * Si tu passes à plusieurs instances (PM2 cluster), remplace le store par :
 *   const RedisStore = require("rate-limit-redis");
 *   store: new RedisStore({ client: redisClient })
 *
 * Pour 20 000 utilisateurs sur UNE instance VPS solide (4 vCPU / 8 Go) → OK sans Redis.
 * Pour scale horizontale multi-serveur → Redis requis.
 */

// ── Global : 500 req / 15 min par IP ────────────────────────────────────────
const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Trop de requêtes. Réessayez dans 15 minutes." },
  skip: (req) => {
    // Ne pas limiter les health checks
    return req.path === "/health";
  },
});

// ── Auth : 10 tentatives / 15 min par IP ────────────────────────────────────
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Trop de tentatives. Réessayez dans 15 minutes." },
});

// ── Auth admin : 5 tentatives / 15 min par IP (plus strict) ─────────────────
const adminAuthRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Trop de tentatives admin. Réessayez dans 15 minutes." },
});

// ── Paiement : 3 req / 2 min par IP+email+candidat ──────────────────────────
const paymentRateLimiter = rateLimit({
  windowMs: 2 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => {
    const email       = typeof req.body?.voterEmail   === "string" ? req.body.voterEmail.trim().toLowerCase()  : "";
    const candidateId = typeof req.body?.candidateId  === "string" ? req.body.candidateId.trim()               : "";
    return `${req.ip}:${email}:${candidateId}`;
  },
  skipSuccessfulRequests: false,
  message: { success: false, message: "Veuillez attendre 2 minutes avant de relancer un vote pour ce candidat." },
});

// ── Ranking / pages publiques : 120 req / min par IP (lecture intensive) ─────
const rankingRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Trop de requêtes. Ralentissez." },
});

// ── Inscription candidat : 3 req / heure par IP ─────────────────────────────
const candidacyRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { success: false, message: "Vous avez déjà soumis plusieurs candidatures. Réessayez plus tard." },
});

// ── Likes : 60 req / min par IP (anti-spam des compteurs de likes) ──────────
const likeRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Trop d'actions. Ralentissez." },
});

module.exports = {
  globalRateLimiter,
  authRateLimiter,
  adminAuthRateLimiter,
  paymentRateLimiter,
  rankingRateLimiter,
  candidacyRateLimiter,
  likeRateLimiter,
};
