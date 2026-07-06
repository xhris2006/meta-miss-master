const prisma = require("../utils/prismaClient");

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

module.exports = {
  getSocialLinks,
  updateSocialLinks,
  getDoubleVotes,
  setDoubleVotes,
  SOCIAL_KEYS,
};
