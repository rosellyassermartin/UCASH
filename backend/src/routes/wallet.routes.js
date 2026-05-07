const express = require("express");
const router  = express.Router();
const { getBalance, requestTopup, requestWithdrawal, payFee } = require("../controllers/wallet.controller");
const { protect, authorize } = require("../middleware/auth.middleware");

router.use(protect);
router.get( "/balance",  getBalance);
router.post("/topup",    authorize("student"), requestTopup);
router.post("/withdraw", authorize("student"), requestWithdrawal);
router.post("/pay",      authorize("student"), payFee);

module.exports = router;
