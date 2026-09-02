/**
 * Cache en mémoire partagée (sans Redis).
 * Pour une vraie infrastructure multi-instance, remplacer par ioredis.
 * Pour 20 000 utilisateurs sur UNE instance : ce cache suffit parfaitement.
 */

const store = new Map();

function get(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

function set(key, value, ttlSeconds = 5) {
  store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

function del(key) {
  store.delete(key);
}

function delPattern(prefix) {
  for (const k of store.keys()) {
    if (k.startsWith(prefix)) store.delete(k);
  }
}

// Nettoyage des entrées expirées toutes les 60s pour éviter les fuites mémoire
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (now > v.expiresAt) store.delete(k);
  }
}, 60_000);

module.exports = { get, set, del, delPattern };
