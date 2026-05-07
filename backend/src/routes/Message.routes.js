const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth.middleware");
const {
  sendMessage,
  getConversation,
  replyMessage,
  getStudentList,
} = require("../controllers/Message.controller");

// All message routes require a valid token
router.use(protect);

// Student sends a message to admin
router.post("/send", sendMessage);

// Admin replies to a student
router.post("/reply", authorize("admin"), replyMessage);

// Admin: get list of students who sent messages
router.get("/admin/students", authorize("admin"), getStudentList);

// Get full conversation for a user (student or admin view)
// NOTE: this must come LAST since /:userId matches everything
router.get("/:userId", getConversation);

module.exports = router;