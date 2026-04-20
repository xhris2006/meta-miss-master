const express = require("express");
const { body } = require("express-validator");
const authController = require("../controllers/auth.controller");
const { authenticate } = require("../middlewares/auth");
const { authRateLimiter } = require("../middlewares/rateLimiter");

const router = express.Router();

const registerValidation = [
  body("name").trim().isLength({ min: 2, max: 100 }).withMessage("Nom requis (2-100 caractères)"),
  body("email").isEmail().normalizeEmail().withMessage("Email invalide"),
  body("password").isLength({ min: 8 }).withMessage("Mot de passe minimum 8 caractères"),
  body("phone").optional().isMobilePhone().withMessage("Numéro de téléphone invalide")
];

const loginValidation = [
  body("email").isEmail().normalizeEmail(),
  body("password").notEmpty()
];

router.post("/register", authRateLimiter, registerValidation, authController.register);
router.post("/login", authRateLimiter, loginValidation, authController.login);
router.post("/refresh", authRateLimiter, authController.refreshToken);
router.get("/me", authenticate, authController.me);

module.exports = router;
