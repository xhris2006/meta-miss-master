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
      const data = { ...req.body, photoPath: req.file.filename };
      const candidate = await candidateService.createCandidate(data);
      res.status(201).json({ success: true, message: "Candidature soumise, en attente de validation", data: candidate });
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
}

module.exports = new CandidateController();
