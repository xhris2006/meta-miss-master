const jwt = require("jsonwebtoken");
const { AppError } = require("../utils/errors");
const { adminCredsFingerprint } = require("../services/auth.service");

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(new AppError("Token manquant", 401));
  }
  const token = header.split(" ")[1];
  try {
    // SÉCURITÉ : algorithme épinglé (HS256) pour éviter toute confusion d'algo.
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });

    // SÉCURITÉ : les jetons admin embarquent l'empreinte des identifiants (cv).
    // Si les identifiants admin ont changé depuis l'émission du jeton, toutes
    // les sessions ouvertes sont fermées → reconnexion obligatoire.
    if (payload.role === "ADMIN" && payload.id === "env-admin") {
      const cv = adminCredsFingerprint();
      if (!cv || payload.cv !== cv) {
        return next(new AppError("Identifiants modifiés — reconnexion requise", 401));
      }
    }

    req.user = payload;
    next();
  } catch {
    next(new AppError("Token invalide ou expiré", 401));
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "ADMIN") {
    return next(new AppError("Accès admin requis", 403));
  }
  next();
}

module.exports = { authenticate, requireAdmin };
