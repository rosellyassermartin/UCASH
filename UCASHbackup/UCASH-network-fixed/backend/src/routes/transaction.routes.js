const express = require("express");
const router  = express.Router();
const {
  getMyTransactions,
  getTransactionById,
  getReceipt,
  getAllTransactions,
  verifyTransaction,
  rejectTransaction,
} = require("../controllers/transaction.controller");
const { protect, authorize } = require("../middleware/auth.middleware");

router.use(protect);

// IMPORTANT: specific paths must come before /:id to avoid conflicts
router.get("/my",           getMyTransactions);
router.get("/admin/all",    authorize("admin"), getAllTransactions);
router.get("/receipt/:id",  getReceipt);
router.get("/:id",          getTransactionById);
router.put("/:id/verify",   authorize("admin"), verifyTransaction);
router.put("/:id/reject",   authorize("admin"), rejectTransaction);

module.exports = router;
