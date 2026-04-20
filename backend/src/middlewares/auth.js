const jwt = require("jsonwebtoken");
const { AppError } = require("../utils/errors");

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(new AppError("Token manquant", 401));
  }
  const token = header.split(" ")[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
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
