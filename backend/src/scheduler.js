const logger = require("./utils/logger");
const { awardDailyPoints } = require("./services/points.service");

// Cible : 21h00 au Cameroun (UTC+1) = 20h00 UTC. Les serveurs (Railway) tournent
// en UTC. Planificateur sans dépendance : setTimeout jusqu'à la prochaine échéance,
// puis ré-armement pour le lendemain. L'idempotence (PointsAward.day) protège des
// double-déclenchements en cas de redémarrage proche de l'heure cible.
const TARGET_UTC_HOUR = 20;
const TARGET_UTC_MIN = 0;

function msUntilNextTarget() {
  const now = new Date();
  const next = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
    TARGET_UTC_HOUR, TARGET_UTC_MIN, 0, 0,
  ));
  if (next.getTime() <= now.getTime()) next.setUTCDate(next.getUTCDate() + 1);
  return next.getTime() - now.getTime();
}

function scheduleNext() {
  const delay = msUntilNextTarget();
  const hrs = (delay / 3_600_000).toFixed(1);
  logger.info(`⏰ Prochaine attribution de points dans ~${hrs}h (21h00 Cameroun)`);
  setTimeout(async () => {
    try {
      const res = await awardDailyPoints();
      if (res.alreadyAwarded) {
        logger.info(`Points déjà attribués pour ${res.day}, aucun changement`);
      } else {
        logger.info(`Points attribués pour ${res.day} : ${res.awarded.length} candidat(s)`);
      }
    } catch (err) {
      logger.error("Erreur lors de l'attribution quotidienne des points:", err.message);
    } finally {
      scheduleNext(); // ré-arme pour le jour suivant
    }
  }, delay);
}

function startPointsScheduler() {
  scheduleNext();
}

module.exports = { startPointsScheduler };
