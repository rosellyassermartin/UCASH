const express = require("express");
const router  = express.Router();
const { protect } = require("../middleware/auth.middleware");
const { pool }    = require("../config/db");

// ── GET /api/users/profile ────────────────────────────────────
router.get("/profile", protect, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, email, phone, role, student_id, course, year, status, created_at FROM users WHERE id = ?",
      [req.user.id]
    );
    return res.json({ success: true, user: rows[0] });
  } catch (err) {
    console.error("getProfile error:", err);
    return res.status(500).json({ success: false, message: "Could not fetch profile." });
  }
});

// ── PUT /api/users/profile ────────────────────────────────────
router.put("/profile", protect, async (req, res) => {
  try {
    const { name, phone } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, message: "Name must be at least 2 characters." });
    }

    await pool.query(
      "UPDATE users SET name = ?, phone = ? WHERE id = ?",
      [name.trim(), phone?.trim() || null, req.user.id]
    );

    const [updated] = await pool.query(
      "SELECT id, name, email, phone, role, student_id, course, year, status FROM users WHERE id = ?",
      [req.user.id]
    );

    return res.json({ success: true, message: "Profile updated.", user: updated[0] });
  } catch (err) {
    console.error("updateProfile error:", err);
    return res.status(500).json({ success: false, message: "Could not update profile." });
  }
});

// ── GET /api/users/fees ───────────────────────────────────────
router.get("/fees", protect, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, type, label, total_amount, paid_amount,
              ROUND(total_amount - paid_amount, 2) AS remaining_amount,
              semester, due_date,
              IF(paid_amount >= total_amount, 1, 0) AS is_paid
       FROM fees
       WHERE user_id = ?
       ORDER BY FIELD(type, 'tuition', 'lab', 'library', 'misc')`,
      [req.user.id]
    );
    return res.json({ success: true, fees: rows });
  } catch (err) {
    console.error("getFees error:", err);
    return res.status(500).json({ success: false, message: "Could not fetch fees." });
  }
});

module.exports = router;
