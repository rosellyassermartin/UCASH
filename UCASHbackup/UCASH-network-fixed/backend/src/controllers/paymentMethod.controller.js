const { pool } = require("../config/db");

// ── GET /api/payment-methods ──────────────────────────────────
const getMyPaymentMethods = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM payment_methods WHERE user_id = ? ORDER BY is_primary DESC, created_at ASC",
      [req.user.id]
    );
    return res.json({ success: true, methods: rows });
  } catch (err) {
    console.error("getMyPaymentMethods error:", err);
    return res.status(500).json({ success: false, message: "Could not fetch payment methods." });
  }
};

// ── POST /api/payment-methods ─────────────────────────────────
const addPaymentMethod = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { type, accountNumber, accountName, isPrimary } = req.body;

    if (!type || !accountNumber) {
      return res.status(400).json({ success: false, message: "Type and account number are required." });
    }

    const valid = ["gcash", "maya", "paymaya", "bdo", "metrobank"];
    if (!valid.includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid payment method type." });
    }

    // Unique constraint (user_id, type) enforced by DB — catch duplicate gracefully
    const [existing] = await conn.query(
      "SELECT id FROM payment_methods WHERE user_id = ? AND type = ?",
      [req.user.id, type]
    );
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: `You already have a linked ${type} account.`,
      });
    }

    await conn.beginTransaction();

    // Unset primary if this should be primary
    if (isPrimary) {
      await conn.query(
        "UPDATE payment_methods SET is_primary = 0 WHERE user_id = ?",
        [req.user.id]
      );
    }

    const [result] = await conn.query(
      `INSERT INTO payment_methods (user_id, type, account_number, account_name, is_primary)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, type, accountNumber.trim(), accountName?.trim() || null, isPrimary ? 1 : 0]
    );

    await conn.commit();

    const [method] = await conn.query(
      "SELECT * FROM payment_methods WHERE id = ?",
      [result.insertId]
    );
    return res.status(201).json({ success: true, message: "Payment method linked.", method: method[0] });
  } catch (err) {
    await conn.rollback();
    console.error("addPaymentMethod error:", err);
    return res.status(500).json({ success: false, message: "Could not link payment method." });
  } finally {
    conn.release();
  }
};

// ── PUT /api/payment-methods/:id/primary ─────────────────────
const setPrimary = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const [check] = await conn.query(
      "SELECT id FROM payment_methods WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );
    if (check.length === 0) {
      return res.status(404).json({ success: false, message: "Payment method not found." });
    }

    await conn.beginTransaction();
    await conn.query(
      "UPDATE payment_methods SET is_primary = 0 WHERE user_id = ?",
      [req.user.id]
    );
    await conn.query(
      "UPDATE payment_methods SET is_primary = 1 WHERE id = ?",
      [req.params.id]
    );
    await conn.commit();

    return res.json({ success: true, message: "Primary account updated." });
  } catch (err) {
    await conn.rollback();
    console.error("setPrimary error:", err);
    return res.status(500).json({ success: false, message: "Could not update primary account." });
  } finally {
    conn.release();
  }
};

// ── DELETE /api/payment-methods/:id ──────────────────────────
const deletePaymentMethod = async (req, res) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM payment_methods WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Payment method not found." });
    }
    return res.json({ success: true, message: "Payment method removed." });
  } catch (err) {
    console.error("deletePaymentMethod error:", err);
    return res.status(500).json({ success: false, message: "Could not remove payment method." });
  }
};

module.exports = { getMyPaymentMethods, addPaymentMethod, setPrimary, deletePaymentMethod };
