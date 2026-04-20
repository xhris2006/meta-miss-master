const paymentService = require("../services/payment.service");
const { validationResult } = require("express-validator");
const logger = require("../utils/logger");
const crypto = require("crypto");

class PaymentController {
  /**
   * Initialize a payment for voting
   * POST /api/payments/initialize
   */
  async initialize(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, errors: errors.array() });
      }

      const { candidateId, amount } = req.body;
      const userId = req.user.id;

      // amount must be >= 100 FCFA (1 vote)
      if (amount < 100) {
        return res.status(400).json({
          success: false,
          message: "Montant minimum : 100 FCFA (1 vote)"
        });
      }

      const result = await paymentService.initializePayment({
        userId,
        candidateId,
        amount: Math.floor(amount), // whole FCFA
        userEmail: req.user.email,
        userName: req.user.name,
        userPhone: req.user.phone
      });

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Verify payment status (called from frontend after redirect)
   * GET /api/payments/verify/:txRef
   */
  async verify(req, res, next) {
    try {
      const { txRef } = req.params;
      const result = await paymentService.verifyPayment(txRef, req.user.id);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Flutterwave webhook handler
   * POST /api/payments/webhook
   */
  async webhook(req, res, next) {
    try {
      // Validate Flutterwave signature
      const signature = req.headers["verif-hash"];
      const secretHash = process.env.FLW_SECRET_HASH;

      if (!signature || signature !== secretHash) {
        logger.warn("Webhook: invalid signature received");
        return res.status(401).json({ message: "Unauthorized" });
      }

      // req.body is raw buffer here (see app.js)
      const payload = JSON.parse(req.body.toString());
      logger.info(`Webhook received: event=${payload.event}, tx=${payload.data?.tx_ref}`);

      await paymentService.processWebhook(payload);

      res.status(200).json({ message: "Webhook processed" });
    } catch (err) {
      logger.error("Webhook error:", err);
      // Always return 200 to Flutterwave to avoid retries for logic errors
      res.status(200).json({ message: "Received" });
    }
  }

  /**
   * Get user's payment history
   * GET /api/payments/history
   */
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
