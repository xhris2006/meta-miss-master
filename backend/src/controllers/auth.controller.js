const authService = require("../services/auth.service");
const { validationResult } = require("express-validator");

class AuthController {
  async register(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, errors: errors.array() });
      }
      const { name, email, password, phone } = req.body;
      const result = await authService.register({ name, email, password, phone });
      res.status(201).json({ success: true, message: "Compte créé avec succès", data: result });
    } catch (err) {
      next(err);
    }
  }

  async login(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, errors: errors.array() });
      }
      const { email, password } = req.body;
      const result = await authService.login({ email, password });
      res.json({ success: true, message: "Connexion réussie", data: result });
    } catch (err) {
      next(err);
    }
  }

  async me(req, res, next) {
    try {
      const user = await authService.getMe(req.user.id);
      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) return res.status(400).json({ success: false, message: "Token manquant" });
      const result = await authService.refresh(refreshToken);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
