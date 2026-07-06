const prisma = require("../utils/prismaClient");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { AppError } = require("../utils/errors");

const ACCESS_EXPIRY = "2h";
const REFRESH_EXPIRY = "7d";

// Comparaison de chaînes en temps constant (anti timing-attack).
function safeEqual(a, b) {
  const ab = Buffer.from(String(a ?? ""), "utf8");
  const bb = Buffer.from(String(b ?? ""), "utf8");
  if (ab.length !== bb.length) {
    crypto.timingSafeEqual(ab, ab); // garde un coût constant
    return false;
  }
  return crypto.timingSafeEqual(ab, bb);
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
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const displayName = (process.env.ADMIN_DISPLAY_NAME || "Administrateur").trim();

  return {
    id: "env-admin",
    name: displayName,
    email,
    role: "ADMIN",
  };
}

// Lockout en mémoire : ip → { count, until }
const ADMIN_LOCKOUT = new Map();
const MAX_ADMIN_ATTEMPTS = 5;
const ADMIN_LOCKOUT_MS   = 15 * 60 * 1000; // 15 minutes

function getAdminConfig() {
  const email        = (process.env.ADMIN_EMAIL            || "").trim().toLowerCase();
  const passwordHash = (process.env.ADMIN_PASSWORD_HASH    || "").trim(); // bcrypt hash
  const passwordRaw  = (process.env.ADMIN_PASSWORD         || "").trim(); // fallback plain (dev)
  const propertyNumber  = (process.env.ADMIN_PROPERTY_NUMBER  || "").trim();
  const motherFullName  = (process.env.ADMIN_MOTHER_FULL_NAME || "").trim().toLowerCase();

  if (!email || (!passwordHash && !passwordRaw) || !propertyNumber || !motherFullName) {
    throw new AppError("Variables admin manquantes sur le serveur", 500);
  }

  return { email, passwordHash, passwordRaw, propertyNumber, motherFullName };
}

async function loginAdmin({ email, password, propertyNumber, motherFullName, ip = "unknown" }) {
  const config = getAdminConfig();

  // ── Lockout par IP ──────────────────────────────────────────────────────────
  const lock = ADMIN_LOCKOUT.get(ip);
  if (lock && lock.until > Date.now()) {
    const minutes = Math.ceil((lock.until - Date.now()) / 60000);
    throw new AppError(`Trop de tentatives. Réessayez dans ${minutes} minute(s).`, 429);
  }

  // ── Vérifications timing-safe ───────────────────────────────────────────────
  const emailOk  = safeEqual(email.toLowerCase().trim(), config.email);
  const propOk   = safeEqual(propertyNumber.trim(), config.propertyNumber);
  const motherOk = safeEqual(motherFullName.toLowerCase().trim(), config.motherFullName);

  // Préférer le hash bcrypt ; fallback comparaison brute si ADMIN_PASSWORD_HASH non défini (dev)
  let pwOk = false;
  if (config.passwordHash) {
    pwOk = await bcrypt.compare(password, config.passwordHash);
  } else {
    // Dev uniquement — bcrypt.compare factice pour garder le timing constant
    await bcrypt.compare(password, "$2a$10$AAAAAAAAAAAAAAAAAAAAAA.BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB");
    pwOk = password === config.passwordRaw;
  }

  const isValid = emailOk && pwOk && propOk && motherOk;

  if (!isValid) {
    const current = ADMIN_LOCKOUT.get(ip) || { count: 0, until: 0 };
    current.count += 1;
    if (current.count >= MAX_ADMIN_ATTEMPTS) {
      current.until = Date.now() + ADMIN_LOCKOUT_MS;
      current.count = 0;
    }
    ADMIN_LOCKOUT.set(ip, current);
    throw new AppError("Identifiants admin invalides", 401);
  }

  // Succès — réinitialiser le lockout
  ADMIN_LOCKOUT.delete(ip);

  const user   = buildAdminUser();
  const tokens = generateTokens({ id: user.id, email: user.email, role: user.role });
  return { user, ...tokens };
}

async function registerUser({ name, email, password, phone }) {
  const normalizedEmail = email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    throw new AppError("Cet email est déjà utilisé", 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      phone: phone?.trim() || null,
      role: "USER",
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
    }
  });

  const tokens = generateTokens({ id: user.id, email: user.email, role: user.role });
  return { user, ...tokens };
}

async function loginUser({ email, password }) {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError("Email ou mot de passe invalide", 401);
  }

  // SÉCURITÉ : un compte ADMIN ne peut JAMAIS se connecter via le login
  // utilisateur (cela contournerait la double-authentification admin). Message
  // générique pour ne pas révéler qu'il s'agit d'un compte admin.
  if (user.role === "ADMIN") {
    throw new AppError("Email ou mot de passe invalide", 401);
  }

  const publicUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
  };

  const tokens = generateTokens({ id: user.id, email: user.email, role: user.role });
  return { user: publicUser, ...tokens };
}

async function loginOrRegisterGoogle({ email, name }) {
  const normalizedEmail = email.toLowerCase().trim();
  let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  // SÉCURITÉ : un compte ADMIN ne peut pas obtenir de session admin via Google
  // SSO (les admins passent par /auth/admin/login avec les facteurs dédiés).
  if (user && user.role === "ADMIN") {
    throw new AppError("Connexion non autorisée pour ce compte", 403);
  }

  if (!user) {
    const passwordHash = await bcrypt.hash(`${normalizedEmail}-${Date.now()}`, 10);
    user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: "USER",
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
      }
    });
  }

  const publicUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
  };
  const tokens = generateTokens({ id: user.id, email: user.email, role: user.role });
  return { user: publicUser, ...tokens };
}

async function getMe(userPayload) {
  if (!userPayload) {
    throw new AppError("Utilisateur introuvable", 404);
  }

  if (userPayload.role === "ADMIN" && userPayload.id === "env-admin") {
    return buildAdminUser();
  }

  const user = await prisma.user.findUnique({
    where: { id: userPayload.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
    }
  });

  if (!user) {
    throw new AppError("Utilisateur introuvable", 404);
  }

  return user;
}

async function refresh(refreshToken) {
  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, {
      algorithms: ["HS256"],
    });

    if (payload.role === "ADMIN" && payload.id === "env-admin") {
      const user = buildAdminUser();
      return generateTokens({ id: user.id, email: user.email, role: user.role });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user) throw new AppError("Token invalide", 401);

    return generateTokens({ id: user.id, email: user.email, role: user.role });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Token invalide ou expiré", 401);
  }
}

module.exports = { loginAdmin, registerUser, loginUser, loginOrRegisterGoogle, getMe, refresh };
