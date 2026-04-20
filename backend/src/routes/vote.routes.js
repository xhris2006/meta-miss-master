const express = require("express");
const voteController = require("../controllers/vote.controller");
const { authenticate } = require("../middlewares/auth");
const router = express.Router();

router.get("/candidate/:candidateId", voteController.getVotesByCandidate);
router.get("/my", authenticate, voteController.getUserVotes);

module.exports = router;
