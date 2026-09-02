const logger = require("../utils/logger");

function errorHandler(err, req, res, next) {
  const status = err.statusCode || err.status || 500;
  const rawMessage = err.message || "Erreur interne du serveur";

  if (status >= 500) {
    logger.error(`[${req.method}] ${req.path} — ${status}: ${rawMessage}`, { stack: err.stack });
  }

  // SÉCURITÉ : en production, on ne renvoie jamais le détail d'une erreur 5xx
  // (qui peut contenir des infos internes : schéma DB, chemins, etc.).
  const isProd = process.env.NODE_ENV === "production";
  const message = status >= 500 && isProd ? "Erreur interne du serveur" : rawMessage;

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack })
  });
}

module.exports = { errorHandler };
