const prisma = require("../utils/prismaClient");
const candidateService = require("../services/candidate.service");
const { validationResult } = require("express-validator");


class CandidateController {

  async register(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, errors: errors.array() });
      }
      if (!req.file) {
        return res.status(400).json({ success: false, message: "Photo obligatoire" });
      }
      const data = {
        ...req.body,
        photoPath: req.file.path || req.file.secure_url || "",
        instagram: req.body.instagram,
        tiktok: req.body.tiktok,
        snap: req.body.snap,
        whatsappFan: req.body.whatsappFan,
        phone: req.body.phone,
        userId: req.user?.id,
      };
      const candidate = await candidateService.createCandidate(data);
      res.status(201).json({
        success: true,
        message: "Candidature soumise, en attente de validation",
        data: candidate,
      });
    } catch (err) {
      next(err);
    }
  }

  async getAll(req, res, next) {
    try {
      const { type, page = 1, limit = 20 } = req.query;
      const result = await candidateService.getAllApproved({ type, page: +page, limit: +limit });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const candidate = await candidateService.getById(req.params.id);
      if (!candidate) return res.status(404).json({ success: false, message: "Candidat introuvable" });
      res.json({ success: true, data: candidate });
    } catch (err) {
      next(err);
    }
  }

  async getTopCandidates(req, res, next) {
    try {
      const { type, limit = 10 } = req.query;
      const candidates = await candidateService.getTop({ type, limit: +limit });
      res.json({ success: true, data: candidates });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/candidates/:id/like — idempotent : 1 like max par appareil.
  // Le front envoie { deviceId } ; la contrainte unique (candidateId, deviceId)
  // en base garantit qu'un même appareil ne peut JAMAIS être compté deux fois,
  // même en spammant la requête directement.
  async like(req, res, next) {
    try {
      const { id } = req.params;
      const deviceId = String(req.body?.deviceId || "").trim().slice(0, 100);
      if (!deviceId) {
        return res.status(400).json({ success: false, message: "deviceId requis" });
      }
      const candidate = await prisma.candidate.findUnique({ where: { id } });
      if (!candidate) {
        return res.status(404).json({ success: false, message: "Candidat introuvable" });
      }

      let totalLikes = candidate.totalLikes;
      try {
        const updated = await prisma.$transaction(async (tx) => {
          // Échoue avec P2002 si ce device a déjà liké ce candidat
          await tx.candidateLike.create({ data: { candidateId: id, deviceId } });
          return tx.candidate.update({
            where: { id },
            data: { totalLikes: { increment: 1 } },
            select: { totalLikes: true },
          });
        });
        totalLikes = updated.totalLikes;
      } catch (e) {
        // Déjà liké depuis cet appareil → on renvoie le total inchangé (idempotent)
        if (e.code !== "P2002") throw e;
      }

      res.json({ success: true, data: { totalLikes, liked: true } });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/candidates/:id/like — ne décrémente QUE si ce device avait
  // réellement liké (sinon aucun effet). Body : { deviceId }.
  async unlike(req, res, next) {
    try {
      const { id } = req.params;
      const deviceId = String(req.body?.deviceId || "").trim().slice(0, 100);
      if (!deviceId) {
        return res.status(400).json({ success: false, message: "deviceId requis" });
      }
      const candidate = await prisma.candidate.findUnique({ where: { id } });
      if (!candidate) {
        return res.status(404).json({ success: false, message: "Candidat introuvable" });
      }

      let totalLikes = candidate.totalLikes;
      const updated = await prisma.$transaction(async (tx) => {
        const removed = await tx.candidateLike.deleteMany({
          where: { candidateId: id, deviceId },
        });
        // Jamais liké depuis cet appareil → rien à décrémenter
        if (removed.count === 0) return null;
        return tx.candidate.update({
          where: { id },
          data: { totalLikes: { decrement: candidate.totalLikes > 0 ? 1 : 0 } },
          select: { totalLikes: true },
        });
      });
      if (updated) totalLikes = updated.totalLikes;

      res.json({ success: true, data: { totalLikes, liked: false } });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CandidateController();
