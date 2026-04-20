const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { AppError } = require("../utils/errors");

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;
const ACCESS_EXPIRY = "2h";
const REFRESH_EXPIRY = "7d";

function generateTokens(payload) {
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_EXPIRY });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });
  return { accessToken, refreshToken };
}

async function register({ name, email, password, phone }) {
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) throw new AppError("Email déjà utilisé", 409);

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: { name, email: email.toLowerCase(), passwordHash, phone },
    select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true }
  });

  const tokens = generateTokens({ id: user.id, email: user.email, role: user.role });
  return { user, ...tokens };
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) throw new AppError("Email ou mot de passe incorrect", 401);

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError("Email ou mot de passe incorrect", 401);

  const tokens = generateTokens({ id: user.id, email: user.email, role: user.role });
  const { passwordHash, ...safeUser } = user;
  return { user: safeUser, ...tokens };
}

async function getMe(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true }
  });
  if (!user) throw new AppError("Utilisateur introuvable", 404);
  return user;
}

async function refresh(refreshToken) {
  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user) throw new AppError("Token invalide", 401);
    const tokens = generateTokens({ id: user.id, email: user.email, role: user.role });
    return tokens;
  } catch {
    throw new AppError("Token invalide ou expiré", 401);
  }
}

module.exports = { register, login, getMe, refresh };
