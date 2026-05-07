const express = require("express");
const router  = express.Router();
const { protect } = require("../middleware/auth.middleware");
const { pool }    = require("../config/db");

// ── GET /api/users/profile ────────────────────────────────────
router.get("/profile", protect, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, phone, role, student_id, course, year, status, created_at FROM users WHERE id = $1",
      [req.user.id]
    );
    return res.json({ success: true, user: result.rows[0] });
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
      "UPDATE users SET name = $1, phone = $2 WHERE id = $3",
      [name.trim(), phone?.trim() || null, req.user.id]
    );

    const updated = await pool.query(
      "SELECT id, name, email, phone, role, student_id, course, year, status FROM users WHERE id = $1",
      [req.user.id]
    );

    return res.json({ success: true, message: "Profile updated.", user: updated.rows[0] });
  } catch (err) {
    console.error("updateProfile error:", err);
    return res.status(500).json({ success: false, message: "Could not update profile." });
  }
});

// ── GET /api/users/fees ───────────────────────────────────────
router.get("/fees", protect, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, type, label, total_amount, paid_amount,
              ROUND((total_amount - paid_amount)::numeric, 2) AS remaining_amount,
              semester, due_date,
              CASE WHEN paid_amount >= total_amount THEN 1 ELSE 0 END AS is_paid
       FROM fees
       WHERE user_id = $1
       ORDER BY CASE type
         WHEN 'tuition' THEN 1
         WHEN 'lab'     THEN 2
         WHEN 'library' THEN 3
         WHEN 'misc'    THEN 4
         ELSE 5
       END`,
      [req.user.id]
    );
    return res.json({ success: true, fees: result.rows });
  } catch (err) {
    console.error("getFees error:", err);
    return res.status(500).json({ success: false, message: "Could not fetch fees." });
  }
});

module.exports = router;