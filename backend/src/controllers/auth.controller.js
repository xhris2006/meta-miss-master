const authService = require("../services/auth.service");
const { validationResult } = require("express-validator");

class AuthController {
  async login(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, errors: errors.array() });
      }

      const { email, password, propertyNumber, motherFullName } = req.body;
      const result = await authService.loginAdmin({
        email,
        password,
        propertyNumber,
        motherFullName,
        ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
      });

      res.json({ success: true, message: "Connexion admin réussie", data: result });
    } catch (err) {
      next(err);
    }
  }

  async registerUser(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, errors: errors.array() });
      }

      const { name, email, password, phone } = req.body;
      const result = await authService.registerUser({ name, email, password, phone });
      res.status(201).json({ success: true, message: "Inscription réussie", data: result });
    } catch (err) {
      next(err);
    }
  }

  async loginUser(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, errors: errors.array() });
      }

      const { email, password } = req.body;
      const result = await authService.loginUser({ email, password });
      res.json({ success: true, message: "Connexion réussie", data: result });
    } catch (err) {
      next(err);
    }
  }

  async me(req, res, next) {
    try {
      const user = await authService.getMe(req.user);
      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ success: false, message: "Token manquant" });
      }

      const result = await authService.refresh(refreshToken);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async googleCallback(req, res, next) {
    try {
      if (!req.user) {
        const fallbackUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/login?tab=login`;
        return res.redirect(fallbackUrl);
      }

      const { accessToken, refreshToken } = req.user;
      const redirectUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/login?tab=login&redirect=/home&token=${accessToken}&refreshToken=${refreshToken}`;
      res.redirect(redirectUrl);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
