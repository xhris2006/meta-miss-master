const express = require("express");
const { body } = require("express-validator");
const candidateController = require("../controllers/candidate.controller");
const { authenticate } = require("../middlewares/auth");
const { upload } = require("../middlewares/upload");

const router = express.Router();

const candidateValidation = [
  body("name").trim().isLength({ min: 2, max: 100 }).withMessage("Nom requis"),
  body("type").isIn(["MISS", "MASTER"]).withMessage("Type invalide"),
  body("age").isInt({ min: 16, max: 35 }).withMessage("Âge entre 16 et 35"),
  body("city").trim().notEmpty().withMessage("Ville requise"),
  body("bio").optional().isLength({ max: 500 })
];

router.get("/", candidateController.getAll);
router.get("/top", candidateController.getTopCandidates);
router.get("/:id", candidateController.getById);
router.post("/register", upload.single("photo"), candidateValidation, candidateController.register);

module.exports = router;
