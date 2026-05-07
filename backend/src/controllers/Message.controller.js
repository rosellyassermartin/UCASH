const { pool } = require("../config/db");

const ADMIN_ID = 1;

// POST /api/messages/send
const sendMessage = async (req, res) => {
  try {
    const sender_id = req.user.id;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "message is required." });
    }

    // RETURNING id instead of result.insertId
    const { rows } = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, message, role)
       VALUES ($1, $2, $3, 'student')
       RETURNING id`,
      [sender_id, ADMIN_ID, message]
    );

    return res.status(201).json({ success: true, messageId: rows[0].id });
  } catch (error) {
    console.error("sendMessage error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

// GET /api/messages/:userId
const getConversation = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    if (!userId) {
      return res.status(400).json({ error: "Valid userId is required." });
    }

    if (req.user.role !== "admin" && req.user.id !== userId) {
      return res.status(403).json({ error: "Not authorized to view this conversation." });
    }

    const { rows } = await pool.query(
      `SELECT * FROM messages
       WHERE (sender_id = $1 OR receiver_id = $2)
       ORDER BY created_at ASC`,
      [userId, userId]
    );

    return res.status(200).json({ success: true, messages: rows });
  } catch (error) {
    console.error("getConversation error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

// POST /api/messages/reply
const replyMessage = async (req, res) => {
  try {
    const sender_id = req.user.id;
    const { receiver_id, message } = req.body;

    if (!receiver_id || !message) {
      return res.status(400).json({ error: "receiver_id and message are required." });
    }

    const { rows } = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, message, role)
       VALUES ($1, $2, $3, 'admin')
       RETURNING id`,
      [sender_id, receiver_id, message]
    );

    return res.status(201).json({ success: true, messageId: rows[0].id });
  } catch (error) {
    console.error("replyMessage error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

// GET /api/messages/admin/students
const getStudentList = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT m.sender_id, u.name, u.student_id, u.course
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.role = 'student'
       ORDER BY u.name ASC`
    );

    return res.status(200).json({ success: true, students: rows });
  } catch (error) {
    console.error("getStudentList error:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

module.exports = { sendMessage, getConversation, replyMessage, getStudentList };