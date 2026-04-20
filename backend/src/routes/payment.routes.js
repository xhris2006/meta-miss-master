const express = require("express");
const { body } = require("express-validator");
const paymentController = require("../controllers/payment.controller");
const { authenticate } = require("../middlewares/auth");
const { paymentRateLimiter } = require("../middlewares/rateLimiter");

const router = express.Router();

// Webhook MUST be before authenticate (no auth needed, raw body)
router.post("/webhook", paymentController.webhook);

router.use(authenticate);

router.post(
  "/initialize",
  paymentRateLimiter,
  [
    body("candidateId").notEmpty().withMessage("Candidat requis"),
    body("amount").isInt({ min: 100 }).withMessage("Montant minimum 100 FCFA")
  ],
  paymentController.initialize
);

router.get("/verify/:txRef", paymentController.verify);
router.get("/history", paymentController.history);

module.exports = router;
