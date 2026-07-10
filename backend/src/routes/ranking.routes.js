// ranking.routes.js
const express = require("express");
const rankingController = require("../controllers/ranking.controller");
const { rankingRateLimiter } = require("../middlewares/rateLimiter");
const router = express.Router();

router.get("/", rankingRateLimiter, rankingController.getGlobalRanking);
router.get("/top", rankingRateLimiter, rankingController.getTopN);
router.get("/top-voters", rankingRateLimiter, rankingController.getTopVoters);
router.get("/stats", rankingController.getStats);

module.exports = router;
