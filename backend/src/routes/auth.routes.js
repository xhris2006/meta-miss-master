const express = require("express");
const passport = require("passport");
const { body } = require("express-validator");
const authController = require("../controllers/auth.controller");
const { authenticate } = require("../middlewares/auth");
const { authRateLimiter, adminAuthRateLimiter } = require("../middlewares/rateLimiter");

const router = express.Router();

const adminLoginValidation = [
  body("email").isEmail().normalizeEmail().withMessage("Email admin invalide"),
  body("password").notEmpty().withMessage("Mot de passe requis"),
  body("propertyNumber").trim().notEmpty().withMessage("Numéro de propriété requis"),
  body("motherFullName").trim().notEmpty().withMessage("Nom complet de la mère requis"),
];

const userRegisterValidation = [
  body("name").trim().isLength({ min: 2 }).withMessage("Nom requis"),
  body("email").isEmail().normalizeEmail().withMessage("Email invalide"),
  body("password").isLength({ min: 6 }).withMessage("Mot de passe d'au moins 6 caractères requis"),
  body("phone").optional().trim().isLength({ min: 7 }).withMessage("Téléphone invalide"),
];

const userLoginValidation = [
  body("email").isEmail().normalizeEmail().withMessage("Email invalide"),
  body("password").notEmpty().withMessage("Mot de passe requis"),
];

router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL || "http://localhost:3000"}/login?tab=login`,
  }),
  authController.googleCallback
);

// SÉCURITÉ : les deux routes mènent au login admin → même limiteur STRICT (5/15min)
// pour éviter qu'un attaquant utilise /login (anciennement plus permissif) pour
// contourner la limite de /admin/login.
router.post("/login", adminAuthRateLimiter, adminLoginValidation, authController.login);
router.post("/admin/login", adminAuthRateLimiter, adminLoginValidation, authController.login);
router.post("/user/register", authRateLimiter, userRegisterValidation, authController.registerUser);
router.post("/user/login", authRateLimiter, userLoginValidation, authController.loginUser);
router.post("/refresh", authRateLimiter, authController.refreshToken);
router.get("/me", authenticate, authController.me);

module.exports = router;
