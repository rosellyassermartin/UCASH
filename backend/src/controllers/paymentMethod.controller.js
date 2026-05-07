const { pool } = require("../config/db");

// ── GET /api/payment-methods ──────────────────────────────────
const getMyPaymentMethods = async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM payment_methods WHERE user_id = $1 ORDER BY is_primary DESC, created_at ASC",
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
  const client = await pool.connect();
  try {
    const { type, accountNumber, accountName, isPrimary } = req.body;

    if (!type || !accountNumber) {
      return res.status(400).json({ success: false, message: "Type and account number are required." });
    }

    const valid = ["gcash", "maya", "paymaya", "bdo", "metrobank"];
    if (!valid.includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid payment method type." });
    }

    const { rows: existing } = await client.query(
      "SELECT id FROM payment_methods WHERE user_id = $1 AND type = $2",
      [req.user.id, type]
    );
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: `You already have a linked ${type} account.` });
    }

    await client.query("BEGIN");

    if (isPrimary) {
      // is_primary is now BOOLEAN — use false instead of 0
      await client.query(
        "UPDATE payment_methods SET is_primary = false WHERE user_id = $1",
        [req.user.id]
      );
    }

    // RETURNING id to get the new row's id
    const { rows: result } = await client.query(
      `INSERT INTO payment_methods (user_id, type, account_number, account_name, is_primary)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [req.user.id, type, accountNumber.trim(), accountName?.trim() || null, isPrimary ? true : false]
    );

    await client.query("COMMIT");

    const { rows: method } = await client.query(
      "SELECT * FROM payment_methods WHERE id = $1",
      [result[0].id]
    );
    return res.status(201).json({ success: true, message: "Payment method linked.", method: method[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("addPaymentMethod error:", err);
    return res.status(500).json({ success: false, message: "Could not link payment method." });
  } finally {
    client.release();
  }
};

// ── PUT /api/payment-methods/:id/primary ─────────────────────
const setPrimary = async (req, res) => {
  const client = await pool.connect();
  try {
    const { rows: check } = await client.query(
      "SELECT id FROM payment_methods WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );
    if (check.length === 0) {
      return res.status(404).json({ success: false, message: "Payment method not found." });
    }

    await client.query("BEGIN");
    // false/true instead of 0/1 — column is BOOLEAN now
    await client.query(
      "UPDATE payment_methods SET is_primary = false WHERE user_id = $1",
      [req.user.id]
    );
    await client.query(
      "UPDATE payment_methods SET is_primary = true WHERE id = $1",
      [req.params.id]
    );
    await client.query("COMMIT");

    return res.json({ success: true, message: "Primary account updated." });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("setPrimary error:", err);
    return res.status(500).json({ success: false, message: "Could not update primary account." });
  } finally {
    client.release();
  }
};

// ── DELETE /api/payment-methods/:id ──────────────────────────
const deletePaymentMethod = async (req, res) => {
  try {
    // result.rowCount instead of result.affectedRows
    const result = await pool.query(
      "DELETE FROM payment_methods WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Payment method not found." });
    }
    return res.json({ success: true, message: "Payment method removed." });
  } catch (err) {
    console.error("deletePaymentMethod error:", err);
    return res.status(500).json({ success: false, message: "Could not remove payment method." });
  }
};

module.exports = { getMyPaymentMethods, addPaymentMethod, setPrimary, deletePaymentMethod };