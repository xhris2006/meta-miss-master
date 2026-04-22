const paymentService = require("../services/payment.service");
const { validationResult } = require("express-validator");
const logger = require("../utils/logger");

class PaymentController {
  async initialize(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, errors: errors.array() });
      }

      const { candidateId, amount, provider, voterName, voterEmail, voterPhone } = req.body;

      if (amount < 100) {
        return res.status(400).json({
          success: false,
          message: "Montant minimum : 100 FCFA (1 vote)",
        });
      }

      const result = await paymentService.initializePayment({
        candidateId,
        amount: Math.floor(amount),
        provider: provider || "fapshi",
        voterName,
        voterEmail,
        voterPhone,
      });

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async verify(req, res, next) {
    try {
      const result = await paymentService.verifyPayment(req.params.txRef);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async webhookFapshi(req, res) {
    try {
      const body = Buffer.isBuffer(req.body) ? JSON.parse(req.body) : req.body;
      await paymentService.processFapshiWebhook(body);
      res.status(200).json({ message: "OK" });
    } catch (err) {
      logger.error("Fapshi wh:", err);
      res.status(200).json({ message: "Received" });
    }
  }

  async webhookCinetPay(req, res) {
    try {
      const body = Buffer.isBuffer(req.body) ? JSON.parse(req.body) : req.body;
      await paymentService.processCinetPayWebhook(body);
      res.status(200).json({ message: "OK" });
    } catch (err) {
      logger.error("CinetPay wh:", err);
      res.status(200).json({ message: "Received" });
    }
  }

  async webhookStripe(req, res) {
    try {
      const sig = req.headers["stripe-signature"];
      if (!sig) return res.status(400).json({ message: "Missing signature" });
      await paymentService.processStripeWebhook(req.body, sig);
      res.status(200).json({ message: "OK" });
    } catch (err) {
      logger.error("Stripe wh:", err.message);
      res.status(400).json({ message: err.message });
    }
  }

  async history(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await paymentService.getUserPayments(req.user.id, +page, +limit);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PaymentController();
