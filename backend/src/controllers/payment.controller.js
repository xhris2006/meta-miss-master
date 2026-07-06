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

      const { candidateId, amount, provider, region, country, voterName, voterEmail, voterPhone } = req.body;

      // Le provider et le montant minimum sont RE-DÉRIVÉS côté service à partir
      // de (region, country) — on ne fait pas confiance au provider du client.
      const result = await paymentService.initializePayment({
        candidateId,
        amount: Math.floor(amount), // BASE (votes) ; les frais sont recalculés serveur
        provider,
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
      // Noms officiels (guide webhook GeniusPay) :
      //   X-Webhook-Signature / X-Webhook-Timestamp / X-Webhook-Event
      // Express met les headers en minuscules. Fallback x-geniuspay-* par sécurité.
      const signature =
        req.headers["x-webhook-signature"] || req.headers["x-geniuspay-signature"];
      const timestamp =
        req.headers["x-webhook-timestamp"] || req.headers["x-geniuspay-timestamp"];
      const event =
        req.headers["x-webhook-event"] || req.headers["x-geniuspay-event"];

      if (!signature) {
        logger.warn("GeniusPay webhook: signature manquante");
        return res.status(401).json({ message: "Signature manquante" });
      }

      // Protection anti-rejeu : on n'applique l'expiration que si un timestamp
      // numérique est fourni (la signature, elle, ne dépend pas du timestamp).
      if (timestamp && /^\d+$/.test(String(timestamp))) {
        const now = Math.floor(Date.now() / 1000);
        if (Math.abs(now - parseInt(timestamp, 10)) > 300) {
          logger.warn("GeniusPay webhook: timestamp trop vieux");
          return res.status(400).json({ message: "Timestamp expiré" });
        }
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

      // req.body est un Buffer (express.raw). On le décode puis on le parse.
      const rawString = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : req.body;
      const parsedBody = typeof rawString === "string" ? JSON.parse(rawString) : rawString;

      logger.info(`GeniusPay webhook reçu: event=${event}`);
      await paymentService.processGeniusPayWebhook(parsedBody);
      res.status(200).json({ message: "OK" });
    } catch (err) {
      logger.error("GeniusPay webhook error:", err);
      res.status(200).json({ message: "Received" });
    }
  }

  // Webhook KPay (dépôts) : générique + /deposit pointent ici.
  async webhookKpay(req, res) {
    try {
      const signature = req.headers["x-kpay-signature"];
      if (!paymentService.verifyKPaySignature({ signature, body: req.body })) {
        logger.warn("KPay webhook: signature invalide");
        return res.status(401).json({ message: "Signature invalide" });
      }
      const raw = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : req.body;
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      await paymentService.processKPayWebhook(parsed);
      res.status(200).json({ message: "OK" });
    } catch (err) {
      logger.error("KPay webhook error:", err);
      res.status(200).json({ message: "Received" });
    }
  }

  // Webhook KPay payout/refund : non utilisés ici. On vérifie la signature et on
  // répond 200 (sinon KPay réessaie). Aucun traitement métier.
  async webhookKpayNoop(req, res) {
    try {
      const signature = req.headers["x-kpay-signature"];
      const ok = paymentService.verifyKPaySignature({ signature, body: req.body });
      logger.info(`KPay webhook (payout/refund) reçu, signature=${ok ? "OK" : "invalide"}`);
    } catch (err) {
      logger.error("KPay webhook (noop) error:", err);
    }
    res.status(200).json({ message: "OK" });
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
