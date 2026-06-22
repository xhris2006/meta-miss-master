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

      const { candidateId, amount, feeAmount, provider, region, country, voterName, voterEmail, voterPhone } = req.body;

      const minAmount = provider === "geniuspay" ? 200 : 100;
      if (amount < minAmount) {
        return res.status(400).json({
          success: false,
          message: `Montant minimum : ${minAmount} FCFA${provider === "geniuspay" ? " (2 votes minimum)" : " (1 vote)"}`,
        });
      }

      const result = await paymentService.initializePayment({
        candidateId,
        amount: Math.floor(amount),
        feeAmount: Math.max(0, Math.floor(feeAmount || 0)),
        provider: provider || "fapshi",
        region,
        country,
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
      logger.error("Fapshi webhook error:", err);
      res.status(200).json({ message: "Received" });
    }
  }

  async webhookGeniusPay(req, res) {
    try {
      const signature = req.headers["x-webhook-signature"];
      const timestamp = req.headers["x-webhook-timestamp"];
      const event = req.headers["x-webhook-event"];

      if (!signature || !timestamp) {
        logger.warn("GeniusPay webhook: headers manquants");
        return res.status(401).json({ message: "Headers manquants" });
      }

      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - parseInt(timestamp)) > 300) {
        logger.warn("GeniusPay webhook: timestamp trop vieux");
        return res.status(400).json({ message: "Timestamp expiré" });
      }

      const isValid = paymentService.verifyGeniusPaySignature({
        signature,
        timestamp,
        body: req.body,
      });

      if (!isValid) {
        logger.warn("GeniusPay webhook: signature invalide");
        return res.status(401).json({ message: "Signature invalide" });
      }

      const parsedBody = typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body;

      logger.info(`GeniusPay webhook reçu: event=${event}`);
      await paymentService.processGeniusPayWebhook(parsedBody);
      res.status(200).json({ message: "OK" });
    } catch (err) {
      logger.error("GeniusPay webhook error:", err);
      res.status(200).json({ message: "Received" });
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
