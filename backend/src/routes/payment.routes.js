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

// ── KPay (Mobile Money Afrique) ───────────────────────────────────────────────
// Générique (fallback) + Dépôts → créditent les votes. Payout/Refund → no-op.
router.post("/webhook/kpay", express.raw({ type: "*/*" }), paymentController.webhookKpay);
router.post("/webhook/kpay/deposit", express.raw({ type: "*/*" }), paymentController.webhookKpay);
router.post("/webhook/kpay/payout", express.raw({ type: "*/*" }), paymentController.webhookKpayNoop);
router.post("/webhook/kpay/refund", express.raw({ type: "*/*" }), paymentController.webhookKpayNoop);

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

    // provider est accepté mais RE-DÉRIVÉ côté serveur depuis (region, country) :
    // source de vérité = resolveProvider (payment.service) — anti-contournement.
    body("provider")
      .optional({ nullable: true, checkFalsy: true })
      .isIn(["fapshi", "paypal", "geniuspay", "kpay"])
      .withMessage("Provider invalide"),

    body("region")
      .optional({ nullable: true, checkFalsy: true })
      .isIn(["africa", "europe", "cards"])
      .withMessage("Région invalide"),

    // feeAmount est accepté mais ignoré : les frais sont recalculés côté serveur.
    body("feeAmount")
      .optional({ nullable: true })
      .isInt({ min: 0 })
      .withMessage("Frais invalides"),

    // Pays : requis pour la méthode "Afrique" (il sert au routage du provider).
    body("country").custom((value, { req }) => {
      const v = value ? String(value).trim() : "";
      if (req.body.region === "africa" && v.length < 2) {
        throw new Error("Pays requis (méthode Afrique)");
      }
      if (v && (v.length < 2 || v.length > 60)) {
        throw new Error("Pays invalide");
      }
      return true;
    }),

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
