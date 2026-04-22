const jwt = require("jsonwebtoken");
const { AppError } = require("../utils/errors");

const ACCESS_EXPIRY = "2h";
const REFRESH_EXPIRY = "7d";

function getAdminConfig() {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = (process.env.ADMIN_PASSWORD || "").trim();
  const propertyNumber = (process.env.ADMIN_PROPERTY_NUMBER || "").trim();
  const motherFullName = (process.env.ADMIN_MOTHER_FULL_NAME || "").trim().toLowerCase();
  const displayName = (process.env.ADMIN_DISPLAY_NAME || "Administrateur").trim();

  if (!email || !password || !propertyNumber || !motherFullName) {
    throw new AppError("Variables admin manquantes sur le serveur", 500);
  }

  return { email, password, propertyNumber, motherFullName, displayName };
}

function generateTokens(payload) {
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: ACCESS_EXPIRY,
  });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRY,
  });

  return { accessToken, refreshToken };
}

function buildAdminUser() {
  const config = getAdminConfig();

  return {
    id: "env-admin",
    name: config.displayName,
    email: config.email,
    role: "ADMIN",
  };
}

async function loginAdmin({ email, password, propertyNumber, motherFullName }) {
  const config = getAdminConfig();

  const isValid =
    email.toLowerCase().trim() === config.email &&
    password === config.password &&
    propertyNumber.trim() === config.propertyNumber &&
    motherFullName.toLowerCase().trim() === config.motherFullName;

  if (!isValid) {
    throw new AppError("Identifiants admin invalides", 401);
  }

  const user = buildAdminUser();
  const tokens = generateTokens({ id: user.id, email: user.email, role: user.role });

  return { user, ...tokens };
}

async function getMe(userPayload) {
  if (!userPayload || userPayload.role !== "ADMIN" || userPayload.id !== "env-admin") {
    throw new AppError("Utilisateur introuvable", 404);
  }

  return buildAdminUser();
}

async function refresh(refreshToken) {
  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    if (payload.role !== "ADMIN" || payload.id !== "env-admin") {
      throw new AppError("Token invalide", 401);
    }

    const user = buildAdminUser();
    return generateTokens({ id: user.id, email: user.email, role: user.role });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Token invalide ou expiré", 401);
  }
}

module.exports = { loginAdmin, getMe, refresh };
