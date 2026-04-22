const express = require("express");
const { body } = require("express-validator");
const authController = require("../controllers/auth.controller");
const { authenticate } = require("../middlewares/auth");
const { authRateLimiter } = require("../middlewares/rateLimiter");

const router = express.Router();

const loginValidation = [
  body("email").isEmail().normalizeEmail().withMessage("Email admin invalide"),
  body("password").notEmpty().withMessage("Mot de passe requis"),
  body("propertyNumber").trim().notEmpty().withMessage("Numéro de propriété requis"),
  body("motherFullName").trim().notEmpty().withMessage("Nom complet de la mère requis"),
];

router.post("/login", authRateLimiter, loginValidation, authController.login);
router.post("/admin/login", authRateLimiter, loginValidation, authController.login);
router.post("/refresh", authRateLimiter, authController.refreshToken);
router.get("/me", authenticate, authController.me);

module.exports = router;
