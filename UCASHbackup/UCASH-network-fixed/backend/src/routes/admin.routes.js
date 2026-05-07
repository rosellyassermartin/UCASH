const express = require("express");
const router  = express.Router();
const {
  getDashboardStats,
  getAllStudents,
  createStudent,
  updateStudent,
  suspendStudent,
  deleteStudent,
} = require("../controllers/admin.controller");
const { protect, authorize } = require("../middleware/auth.middleware");

// Every admin route requires a valid JWT + admin role
router.use(protect, authorize("admin"));

router.get( "/stats",                getDashboardStats);
router.get( "/students",             getAllStudents);
router.post("/students",             createStudent);
router.put( "/students/:id",         updateStudent);
router.put( "/students/:id/suspend", suspendStudent);
router.delete("/students/:id",       deleteStudent);

module.exports = router;
