const express = require("express");
const adminController = require("../controllers/admin.controller");
const { authenticate, requireAdmin } = require("../middlewares/auth");

const router = express.Router();
router.use(authenticate, requireAdmin);

router.get("/stats", adminController.getDashboardStats);
router.get("/candidates", adminController.getAllCandidates);
router.patch("/candidates/:id/approve", adminController.approveCandidate);
router.patch("/candidates/:id/reject", adminController.rejectCandidate);
router.delete("/candidates/:id", adminController.deleteCandidate);
router.get("/payments", adminController.getAllPayments);
router.post("/payments/:id/refund", adminController.refundPayment);
router.get("/users", adminController.getAllUsers);
router.delete("/votes/:id", adminController.deleteVote);
router.post("/contest", adminController.createContest);
router.patch("/contest/:id/close", adminController.closeVotes);
router.patch("/contest/:id/open", adminController.openVotes);

module.exports = router;
