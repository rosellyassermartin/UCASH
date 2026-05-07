const { pool } = require("../config/db");

// ── Pagination guard: clamp page/limit to safe values ─────────
const safePage  = (v) => Math.max(1, parseInt(v) || 1);
const safeLimit = (v) => Math.min(100, Math.max(1, parseInt(v) || 20));

// ── GET /api/transactions/my ──────────────────────────────────
const getMyTransactions = async (req, res) => {
  try {
    const { type, status } = req.query;
    const page  = safePage(req.query.page);
    const limit = safeLimit(req.query.limit);
    const offset = (page - 1) * limit;

    // Build WHERE clause safely with parameterised placeholders
    const conditions = ["t.user_id = ?"];
    const params     = [req.user.id];

    if (type)   { conditions.push("t.type = ?");   params.push(type);   }
    if (status) { conditions.push("t.status = ?"); params.push(status); }

    const where = conditions.join(" AND ");

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM transactions t WHERE ${where}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT t.*, u.name AS student_name, u.student_id
       FROM transactions t
       JOIN users u ON u.id = t.user_id
       WHERE ${where}
       ORDER BY t.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      transactions: rows,
    });
  } catch (err) {
    console.error("getMyTransactions error:", err);
    return res.status(500).json({ success: false, message: "Could not fetch transactions." });
  }
};

// ── GET /api/transactions/:id ─────────────────────────────────
const getTransactionById = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.*, u.name AS student_name, u.student_id, u.email AS student_email
       FROM transactions t
       JOIN users u ON u.id = t.user_id
       WHERE t.id = ? AND t.user_id = ?`,
      [req.params.id, req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Transaction not found." });
    }

    return res.json({ success: true, transaction: rows[0] });
  } catch (err) {
    console.error("getTransactionById error:", err);
    return res.status(500).json({ success: false, message: "Could not fetch transaction." });
  }
};

// ── GET /api/transactions/receipt/:id ─────────────────────────
const getReceipt = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.*, u.name AS student_name, u.student_id, u.email AS student_email
       FROM transactions t
       JOIN users u ON u.id = t.user_id
       WHERE t.id = ? AND t.user_id = ?`,
      [req.params.id, req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Transaction not found." });
    }

    const tx = rows[0];
    return res.json({
      success: true,
      receipt: {
        transactionCode:  tx.transaction_code,
        referenceNumber:  tx.reference_number || "N/A",
        date:             tx.created_at,
        student:          tx.student_name,
        studentId:        tx.student_id,
        description:      tx.description,
        amount:           tx.amount,
        type:             tx.type,
        status:           tx.status,
        university:       "University of Cebu",
        system:           "UCash Payment System",
      },
    });
  } catch (err) {
    console.error("getReceipt error:", err);
    return res.status(500).json({ success: false, message: "Could not generate receipt." });
  }
};

// ── GET /api/transactions/admin/all (admin only) ──────────────
const getAllTransactions = async (req, res) => {
  try {
    const { status, type, search } = req.query;
    const page  = safePage(req.query.page);
    const limit = safeLimit(req.query.limit);
    const offset = (page - 1) * limit;

    const conditions = ["1=1"];
    const params     = [];

    if (status) { conditions.push("t.status = ?"); params.push(status); }
    if (type)   { conditions.push("t.type = ?");   params.push(type);   }

    // SECURITY: search uses LIKE with parameterised value — no raw interpolation
    if (search) {
      const like = `%${search}%`;
      conditions.push("(u.name LIKE ? OR u.student_id LIKE ? OR t.transaction_code LIKE ?)");
      params.push(like, like, like);
    }

    const where = conditions.join(" AND ");

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM transactions t
       JOIN users u ON u.id = t.user_id
       WHERE ${where}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT t.*,
              u.name       AS student_name,
              u.student_id AS student_id,
              u.email      AS student_email,
              v.name       AS verified_by_name
       FROM transactions t
       JOIN users u ON u.id = t.user_id
       LEFT JOIN users v ON v.id = t.verified_by
       WHERE ${where}
       ORDER BY t.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      transactions: rows,
    });
  } catch (err) {
    console.error("getAllTransactions error:", err);
    return res.status(500).json({ success: false, message: "Could not fetch transactions." });
  }
};

// ── PUT /api/transactions/:id/verify (admin only) ─────────────
const verifyTransaction = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      "SELECT * FROM transactions WHERE id = ? FOR UPDATE",
      [req.params.id]
    );
    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: "Transaction not found." });
    }

    const tx = rows[0];
    if (tx.status !== "pending") {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: `Transaction is already ${tx.status}.`,
      });
    }

    // Update transaction status
    await conn.query(
      `UPDATE transactions
       SET status = 'verified', verified_by = ?, verified_at = NOW()
       WHERE id = ?`,
      [req.user.id, tx.id]
    );

    // Credit wallet on top-up
    if (tx.type === "topup") {
      await conn.query(
        "UPDATE wallets SET balance = balance + ? WHERE user_id = ?",
        [tx.amount, tx.user_id]
      );
    }

    // Update fee paid_amount on payment
    if (tx.type === "payment") {
      const feeTypes = ["tuition", "lab", "library", "misc"];
      if (feeTypes.includes(tx.category)) {
        await conn.query(
          `UPDATE fees
           SET paid_amount = LEAST(paid_amount + ?, total_amount)
           WHERE user_id = ? AND type = ?
           ORDER BY id ASC LIMIT 1`,
          [tx.amount, tx.user_id, tx.category]
        );
      }
    }

    await conn.commit();

    return res.json({ success: true, message: "Transaction verified successfully." });
  } catch (err) {
    await conn.rollback();
    console.error("verifyTransaction error:", err);
    return res.status(500).json({ success: false, message: "Verification failed." });
  } finally {
    conn.release();
  }
};

// ── PUT /api/transactions/:id/reject (admin only) ─────────────
const rejectTransaction = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { reason } = req.body;

    await conn.beginTransaction();

    const [rows] = await conn.query(
      "SELECT * FROM transactions WHERE id = ? FOR UPDATE",
      [req.params.id]
    );
    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: "Transaction not found." });
    }

    const tx = rows[0];
    if (tx.status !== "pending") {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: `Transaction is already ${tx.status}.`,
      });
    }

    await conn.query(
      `UPDATE transactions
       SET status = 'rejected',
           rejection_reason = ?,
           verified_by = ?,
           verified_at = NOW()
       WHERE id = ?`,
      [reason?.trim() || "Rejected by admin.", req.user.id, tx.id]
    );

    // Restore balance for payment or withdrawal that was pre-deducted
    if (tx.type === "payment" || tx.type === "withdrawal") {
      await conn.query(
        "UPDATE wallets SET balance = balance + ? WHERE user_id = ?",
        [tx.amount, tx.user_id]
      );
    }

    await conn.commit();

    return res.json({ success: true, message: "Transaction rejected." });
  } catch (err) {
    await conn.rollback();
    console.error("rejectTransaction error:", err);
    return res.status(500).json({ success: false, message: "Rejection failed." });
  } finally {
    conn.release();
  }
};

module.exports = {
  getMyTransactions,
  getTransactionById,
  getReceipt,
  getAllTransactions,
  verifyTransaction,
  rejectTransaction,
};
