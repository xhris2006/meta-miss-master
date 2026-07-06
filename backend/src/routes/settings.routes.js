const express = require("express");
const settingsService = require("../services/settings.service");
const contestService = require("../services/contest.service");
const { rankingRateLimiter } = require("../middlewares/rateLimiter");

const router = express.Router();

// Public : état de la promo "votes doubles" (pour afficher un badge côté front).
router.get("/double-votes", rankingRateLimiter, async (req, res, next) => {
  try {
    const enabled = await settingsService.getDoubleVotes();
    res.json({ success: true, data: { enabled } });
  } catch (err) {
    next(err);
  }
});

// Public : infos du concours actif (pour le compte à rebours du début des votes).
// On renvoie aussi serverTime pour que le front calcule le compte à rebours sur
// l'horloge serveur (indépendamment d'une horloge client éventuellement fausse).
router.get("/contest", rankingRateLimiter, async (req, res, next) => {
  try {
    // On prend le concours ouvert ; sinon on retombe sur le plus récent créé.
    // Ainsi le compte à rebours peut s'afficher AVANT même l'ouverture des votes
    // (un concours programmé avec une date de début future suffit).
    let contest = await contestService.getActive();
    if (!contest) {
      const all = await contestService.getAll();
      contest = all && all.length ? all[0] : null;
    }
    const serverTime = new Date().toISOString();
    if (!contest) {
      return res.json({ success: true, data: { contest: null, serverTime } });
    }
    const started = new Date(contest.startDate).getTime() <= Date.now();
    res.json({
      success: true,
      data: {
        name: contest.name,
        startDate: contest.startDate,
        endDate: contest.endDate,
        status: contest.status,
        // "open" = concours ouvert ET date de début atteinte (pour l'affichage).
        open: contest.status === "OPEN" && started,
        serverTime,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
