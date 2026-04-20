const express = require("express");
const contestService = require("../services/contest.service");
const router = express.Router();

router.get("/active", async (req, res, next) => {
  try {
    const contest = await contestService.getActive();
    res.json({ success: true, data: contest });
  } catch (err) { next(err); }
});

module.exports = router;
