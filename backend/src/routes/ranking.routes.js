// ranking.routes.js
const express = require("express");
const rankingController = require("../controllers/ranking.controller");
const router = express.Router();

router.get("/", rankingController.getGlobalRanking);
router.get("/top", rankingController.getTopN);
router.get("/stats", rankingController.getStats);

module.exports = router;
