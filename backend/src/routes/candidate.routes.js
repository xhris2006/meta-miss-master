const express = require("express");
const { body } = require("express-validator");
const candidateController = require("../controllers/candidate.controller");
const { authenticate } = require("../middlewares/auth");
const { upload } = require("../middlewares/upload");
const { likeRateLimiter } = require("../middlewares/rateLimiter");

const router = express.Router();

const candidateValidation = [
  body("name").trim().isLength({ min: 2, max: 100 }).withMessage("Nom requis"),
  body("type").isIn(["MISS", "MASTER"]).withMessage("Type invalide"),
  body("age").isInt({ min: 16, max: 35 }).withMessage("Âge entre 16 et 35"),
  body("city").trim().notEmpty().withMessage("Ville requise"),
  body("bio").optional().isLength({ max: 500 }),
  body("phone").optional().isString().withMessage("Téléphone invalide"),
];

router.get("/", candidateController.getAll);
router.get("/top", candidateController.getTopCandidates);
router.get("/:id", candidateController.getById);
router.post("/register", authenticate, upload.single("photo"), candidateValidation, candidateController.register);

// ── Likes (pas d'auth requise — n'importe qui peut liker, mais rate-limité) ──
router.post("/:id/like", likeRateLimiter, candidateController.like);
router.delete("/:id/like", likeRateLimiter, candidateController.unlike);

module.exports = router;
