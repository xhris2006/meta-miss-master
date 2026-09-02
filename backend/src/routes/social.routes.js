const express = require("express");
const settingsService = require("../services/settings.service");
const { rankingRateLimiter } = require("../middlewares/rateLimiter");

const router = express.Router();

// Public : liens réseaux sociaux affichés sur la page Support.
router.get("/", rankingRateLimiter, async (req, res, next) => {
  try {
    const data = await settingsService.getSocialLinks();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
