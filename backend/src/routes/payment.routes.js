const express = require("express");
const { body } = require("express-validator");
const paymentController = require("../controllers/payment.controller");
const { authenticate } = require("../middlewares/auth");
const { paymentRateLimiter } = require("../middlewares/rateLimiter");

const router = express.Router();

router.post("/webhook/fapshi", express.raw({ type: "*/*" }), paymentController.webhookFapshi);
router.post("/webhook/cinetpay", express.raw({ type: "*/*" }), paymentController.webhookCinetPay);
router.post("/webhook/stripe", express.raw({ type: "application/json" }), paymentController.webhookStripe);

router.post(
  "/initialize",
  paymentRateLimiter,
  [
    body("candidateId").notEmpty().withMessage("Candidat requis"),
    body("amount").isInt({ min: 100 }).withMessage("Montant minimum 100 FCFA"),
    body("provider").isIn(["fapshi", "cinetpay", "stripe"]).withMessage("Provider invalide"),
    body("voterName").trim().isLength({ min: 2, max: 100 }).withMessage("Nom requis"),
    body("voterEmail").isEmail().normalizeEmail().withMessage("Email requis"),
    body("voterPhone")
      .optional()
      .trim()
      .isLength({ min: 6, max: 30 })
      .withMessage("Téléphone invalide"),
  ],
  paymentController.initialize,
);

router.get("/verify/:txRef", paymentController.verify);

router.use(authenticate);
router.get("/history", paymentController.history);

module.exports = router;
