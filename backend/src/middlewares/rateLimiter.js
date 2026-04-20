const rateLimit = require("express-rate-limit");

const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: "Trop de requêtes. Réessayez dans 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Trop de tentatives de connexion. Réessayez plus tard." },
});

const paymentRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { success: false, message: "Trop de tentatives de paiement. Attendez 1 minute." },
});

module.exports = { globalRateLimiter, authRateLimiter, paymentRateLimiter };
