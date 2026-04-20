const logger = require("../utils/logger");

function errorHandler(err, req, res, next) {
  const status = err.statusCode || err.status || 500;
  const message = err.message || "Erreur interne du serveur";

  if (status >= 500) {
    logger.error(`[${req.method}] ${req.path} — ${status}: ${message}`, { stack: err.stack });
  }

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack })
  });
}

module.exports = { errorHandler };
