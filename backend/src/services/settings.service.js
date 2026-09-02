const prisma = require("../utils/prismaClient");
const { AppError } = require("../utils/errors");

// Clés de réseaux sociaux autorisées (whitelist). Toute autre clé est ignorée.
const SOCIAL_KEYS = [
  "whatsappGroup",
  "whatsappChannel",
  "tiktok",
  "youtube",
  "snapchat",
  "telegram",
];

const SINGLETON_ID = "site-settings";

// ─── Accès bas niveau (fusion, jamais d'écrasement total) ───────────────────
async function getRaw() {
  const row = await prisma.siteSetting.findUnique({ where: { id: SINGLETON_ID } });
  return (row && row.data) || {};
}

async function saveRaw(data) {
  await prisma.siteSetting.upsert({
    where: { id: SINGLETON_ID },
    update: { data },
    create: { id: SINGLETON_ID, data },
  });
  return data;
}

// ─── Réseaux sociaux ────────────────────────────────────────────────────────
async function getSocialLinks() {
  const data = await getRaw();
  const out = {};
  for (const k of SOCIAL_KEYS) {
    out[k] = typeof data[k] === "string" ? data[k] : "";
  }
  return out;
}

async function updateSocialLinks(input = {}) {
  const data = await getRaw();
  const merged = { ...data }; // on conserve les autres réglages (ex: doubleVotes)
  for (const k of SOCIAL_KEYS) {
    const v = input[k];
    merged[k] = typeof v === "string" ? v.trim().slice(0, 500) : "";
  }
  await saveRaw(merged);
  return getSocialLinks();
}

// ─── Votes doubles (promo activable par l'admin) ────────────────────────────
async function getDoubleVotes() {
  const data = await getRaw();
  return data.doubleVotes === true;
}

async function setDoubleVotes(enabled) {
  const data = await getRaw();
  const value = enabled === true || enabled === "true";
  await saveRaw({
    ...data,
    doubleVotes: value,
    doubleVotesUpdatedAt: new Date().toISOString(),
  });
  return { enabled: value };
}

// ─── Barème des points quotidiens (modifiable par l'admin) ──────────────────
// pointsByRank[i] = points gagnés par le rang i+1 au classement du soir.
// L'admin peut le changer chaque jour (ex. 1er = 300 aujourd'hui, 100 demain) :
// l'attribution de 21h lit TOUJOURS la valeur enregistrée au moment où elle tourne.
const DEFAULT_POINTS_BY_RANK = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10];
const MAX_POINTS_RANKS = 20;
const MAX_POINTS_VALUE = 1_000_000;

function sanitizePointsScale(input) {
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_POINTS_RANKS) return null;
  const out = [];
  for (const v of input) {
    const n = +v;
    if (!Number.isInteger(n) || n < 0 || n > MAX_POINTS_VALUE) return null;
    out.push(n);
  }
  return out;
}

async function getPointsScale() {
  const data = await getRaw();
  return sanitizePointsScale(data.pointsByRank) || [...DEFAULT_POINTS_BY_RANK];
}

async function setPointsScale(input) {
  const scale = sanitizePointsScale(input);
  if (!scale) {
    throw new AppError(
      `Barème invalide : liste de 1 à ${MAX_POINTS_RANKS} entiers entre 0 et ${MAX_POINTS_VALUE}`,
      400
    );
  }
  const data = await getRaw();
  await saveRaw({
    ...data,
    pointsByRank: scale,
    pointsByRankUpdatedAt: new Date().toISOString(),
  });
  return scale;
}

module.exports = {
  getSocialLinks,
  updateSocialLinks,
  getDoubleVotes,
  setDoubleVotes,
  getPointsScale,
  setPointsScale,
  DEFAULT_POINTS_BY_RANK,
  SOCIAL_KEYS,
};
