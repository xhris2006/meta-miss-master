const express = require("express");
const { body } = require("express-validator");
const paymentController = require("../controllers/payment.controller");
const { authenticate } = require("../middlewares/auth");
const { paymentRateLimiter } = require("../middlewares/rateLimiter");

const router = express.Router();

// ─── Webhooks ─────────────────────────────────────────────────────────────────
router.post(
  "/webhook/fapshi",
  express.raw({ type: "*/*" }),
  paymentController.webhookFapshi
);

router.post(
  "/webhook/geniuspay",
  express.raw({ type: "*/*" }),
  paymentController.webhookGeniusPay
);

// ─── Initialize payment ───────────────────────────────────────────────────────
router.post(
  "/initialize",
  paymentRateLimiter,
  [
    body("candidateId")
      .notEmpty()
      .withMessage("Candidat requis"),

    body("amount")
      .isInt({ min: 100 })
      .withMessage("Montant minimum 100 FCFA"),

    body("feeAmount")
      .optional({ nullable: true })
      .isInt({ min: 0, max: 1000000 })
      .withMessage("Frais invalides"),

    body("provider")
      .isIn(["fapshi", "paypal", "geniuspay"])
      .withMessage("Provider invalide"),

    body("region")
      .optional({ nullable: true, checkFalsy: true })
      .isIn(["africa", "europe", "cards"])
      .withMessage("Région invalide"),

    body("country")
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isLength({ min: 2, max: 60 })
      .withMessage("Pays invalide"),

    body("voterName")
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Nom requis (min 2 caractères)"),

    body("voterEmail")
      .isEmail()
      .normalizeEmail()
      .withMessage("Email invalide"),

    body("voterPhone")
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isLength({ min: 6, max: 30 })
      .withMessage("Téléphone invalide (min 6 caractères)"),
  ],
  paymentController.initialize,
);

// ─── Verify payment ───────────────────────────────────────────────────────────
router.get("/verify/:txRef", paymentController.verify);

// ─── Authenticated routes ─────────────────────────────────────────────────────
router.use(authenticate);
router.get("/history", paymentController.history);

module.exports = router;
