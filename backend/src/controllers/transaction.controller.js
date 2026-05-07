const { pool } = require("../config/db");

const safePage  = (v) => Math.max(1, parseInt(v) || 1);
const safeLimit = (v) => Math.min(100, Math.max(1, parseInt(v) || 20));

// ── GET /api/transactions/my ──────────────────────────────────
const getMyTransactions = async (req, res) => {
  try {
    const { type, status } = req.query;
    const page   = safePage(req.query.page);
    const limit  = safeLimit(req.query.limit);
    const offset = (page - 1) * limit;

    const conditions = ["t.user_id = $1"];
    const params     = [req.user.id];
    let   paramIndex = 2; // next placeholder starts at $2

    if (type)   { conditions.push(`t.type = $${paramIndex++}`);   params.push(type);   }
    if (status) { conditions.push(`t.status = $${paramIndex++}`); params.push(status); }

    const where = conditions.join(" AND ");

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) AS total FROM transactions t WHERE ${where}`,
      params
    );
    const total = Number(countRows[0].total);

    const { rows } = await pool.query(
      `SELECT t.*, u.name AS student_name, u.student_id
       FROM transactions t
       JOIN users u ON u.id = t.user_id
       WHERE ${where}
       ORDER BY t.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return res.json({ success: true, total, page, pages: Math.ceil(total / limit), transactions: rows });
  } catch (err) {
    console.error("getMyTransactions error:", err);
    return res.status(500).json({ success: false, message: "Could not fetch transactions." });
  }
};

// ── GET /api/transactions/:id ─────────────────────────────────
const getTransactionById = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.*, u.name AS student_name, u.student_id, u.email AS student_email
       FROM transactions t
       JOIN users u ON u.id = t.user_id
       WHERE t.id = $1 AND t.user_id = $2`,
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
    const { rows } = await pool.query(
      `SELECT t.*, u.name AS student_name, u.student_id, u.email AS student_email
       FROM transactions t
       JOIN users u ON u.id = t.user_id
       WHERE t.id = $1 AND t.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Transaction not found." });
    }
    const tx = rows[0];
    return res.json({
      success: true,
      receipt: {
        transactionCode: tx.transaction_code,
        referenceNumber: tx.reference_number || "N/A",
        date:            tx.created_at,
        student:         tx.student_name,
        studentId:       tx.student_id,
        description:     tx.description,
        amount:          tx.amount,
        type:            tx.type,
        status:          tx.status,
        university:      "University of Cebu",
        system:          "UCash Payment System",
      },
    });
  } catch (err) {
    console.error("getReceipt error:", err);
    return res.status(500).json({ success: false, message: "Could not generate receipt." });
  }
};

// ── GET /api/transactions/admin/all ──────────────────────────
const getAllTransactions = async (req, res) => {
  try {
    const { status, type, search } = req.query;
    const page   = safePage(req.query.page);
    const limit  = safeLimit(req.query.limit);
    const offset = (page - 1) * limit;

    const conditions = ["1=1"];
    const params     = [];
    let   paramIndex = 1;

    if (status) { conditions.push(`t.status = $${paramIndex++}`); params.push(status); }
    if (type)   { conditions.push(`t.type = $${paramIndex++}`);   params.push(type);   }

    if (search) {
      const like = `%${search}%`;
      // ILIKE = case-insensitive LIKE in PostgreSQL
      conditions.push(
        `(u.name ILIKE $${paramIndex} OR u.student_id ILIKE $${paramIndex + 1} OR t.transaction_code ILIKE $${paramIndex + 2})`
      );
      params.push(like, like, like);
      paramIndex += 3;
    }

    const where = conditions.join(" AND ");

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) AS total FROM transactions t JOIN users u ON u.id = t.user_id WHERE ${where}`,
      params
    );
    const total = Number(countRows[0].total);

    const { rows } = await pool.query(
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
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return res.json({ success: true, total, page, pages: Math.ceil(total / limit), transactions: rows });
  } catch (err) {
    console.error("getAllTransactions error:", err);
    return res.status(500).json({ success: false, message: "Could not fetch transactions." });
  }
};

// ── PUT /api/transactions/:id/verify ─────────────────────────
const verifyTransaction = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      "SELECT * FROM transactions WHERE id = $1 FOR UPDATE",
      [req.params.id]
    );
    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Transaction not found." });
    }

    const tx = rows[0];
    if (tx.status !== "pending") {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: `Transaction is already ${tx.status}.` });
    }

    await client.query(
      `UPDATE transactions
       SET status = 'verified', verified_by = $1, verified_at = NOW()
       WHERE id = $2`,
      [req.user.id, tx.id]
    );

    if (tx.type === "topup") {
      await client.query(
        "UPDATE wallets SET balance = balance + $1 WHERE user_id = $2",
        [tx.amount, tx.user_id]
      );
    }

    if (tx.type === "payment") {
      const feeTypes = ["tuition", "lab", "library", "misc"];
      if (feeTypes.includes(tx.category)) {
        // MySQL had: UPDATE fees ... ORDER BY id ASC LIMIT 1
        // PostgreSQL does NOT support ORDER BY + LIMIT in UPDATE directly.
        // Solution: use a subquery to find the target row's id first, then update by id.
        await client.query(
          `UPDATE fees
           SET paid_amount = LEAST(paid_amount + $1, total_amount)
           WHERE id = (
             SELECT id FROM fees
             WHERE user_id = $2 AND type = $3
             ORDER BY id ASC
             LIMIT 1
           )`,
          [tx.amount, tx.user_id, tx.category]
        );
      }
    }

    await client.query("COMMIT");
    return res.json({ success: true, message: "Transaction verified successfully." });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("verifyTransaction error:", err);
    return res.status(500).json({ success: false, message: "Verification failed." });
  } finally {
    client.release();
  }
};

// ── PUT /api/transactions/:id/reject ─────────────────────────
const rejectTransaction = async (req, res) => {
  const client = await pool.connect();
  try {
    const { reason } = req.body;
    await client.query("BEGIN");

    const { rows } = await client.query(
      "SELECT * FROM transactions WHERE id = $1 FOR UPDATE",
      [req.params.id]
    );
    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Transaction not found." });
    }

    const tx = rows[0];
    if (tx.status !== "pending") {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: `Transaction is already ${tx.status}.` });
    }

    await client.query(
      `UPDATE transactions
       SET status = 'rejected',
           rejection_reason = $1,
           verified_by = $2,
           verified_at = NOW()
       WHERE id = $3`,
      [reason?.trim() || "Rejected by admin.", req.user.id, tx.id]
    );

    if (tx.type === "payment" || tx.type === "withdrawal") {
      await client.query(
        "UPDATE wallets SET balance = balance + $1 WHERE user_id = $2",
        [tx.amount, tx.user_id]
      );
    }

    await client.query("COMMIT");
    return res.json({ success: true, message: "Transaction rejected." });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("rejectTransaction error:", err);
    return res.status(500).json({ success: false, message: "Rejection failed." });
  } finally {
    client.release();
  }
};

module.exports = { getMyTransactions, getTransactionById, getReceipt, getAllTransactions, verifyTransaction, rejectTransaction };