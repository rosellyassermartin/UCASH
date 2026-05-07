const express = require("express");
const router  = express.Router();
const {
  getMyPaymentMethods,
  addPaymentMethod,
  setPrimary,
  deletePaymentMethod,
} = require("../controllers/paymentMethod.controller");
const { protect } = require("../middleware/auth.middleware");

router.use(protect);

router.get("/",              getMyPaymentMethods);
router.post("/",             addPaymentMethod);
router.put("/:id/primary",   setPrimary);
router.delete("/:id",        deletePaymentMethod);

module.exports = router;
