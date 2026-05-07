const { pool } = require("../config/db");

const makeCode = () => {
  const d    = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(Math.random() * 90000) + 10000;
  return `TXN-${d}-${rand}`;
};

// ── GET /api/wallet/balance ───────────────────────────────────
const getBalance = async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT balance FROM wallets WHERE user_id = $1",
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Wallet not found." });
    }
    return res.json({ success: true, balance: rows[0].balance });
  } catch (err) {
    console.error("getBalance error:", err);
    return res.status(500).json({ success: false, message: "Could not fetch balance." });
  }
};

// ── POST /api/wallet/topup ────────────────────────────────────
const requestTopup = async (req, res) => {
  const client = await pool.connect();
  try {
    const { amount, category, referenceNumber } = req.body;
    const parsed = Number(amount);

    if (!parsed || parsed < 50)    return res.status(400).json({ success: false, message: "Minimum top-up amount is ₱50." });
    if (parsed > 50000)            return res.status(400).json({ success: false, message: "Maximum top-up amount is ₱50,000." });

    const valid = ["gcash", "maya", "paymaya", "bdo", "metrobank"];
    if (!valid.includes(category)) return res.status(400).json({ success: false, message: "Invalid payment method." });

    const code = makeCode();
    await client.query("BEGIN");

    await client.query(
      "UPDATE wallets SET balance = balance + $1 WHERE user_id = $2",
      [parsed, req.user.id]
    );

    // RETURNING id to replace insertId
    const { rows: txRows } = await client.query(
      `INSERT INTO transactions
         (user_id, transaction_code, amount, type, category, description, status, reference_number)
       VALUES ($1, $2, $3, 'topup', $4, $5, 'verified', $6)
       RETURNING id`,
      [req.user.id, code, parsed, category, `${category.toUpperCase()} Top-up`, referenceNumber?.trim() || null]
    );

    const { rows: updated } = await client.query(
      "SELECT balance FROM wallets WHERE user_id = $1",
      [req.user.id]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Funds added successfully.",
      transactionId:   txRows[0].id,
      transactionCode: code,
      newBalance:      updated[0]?.balance || 0,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("requestTopup error:", err);
    return res.status(500).json({ success: false, message: "Top-up request failed." });
  } finally {
    client.release();
  }
};

// ── POST /api/wallet/withdraw ─────────────────────────────────
const requestWithdrawal = async (req, res) => {
  const client = await pool.connect();
  try {
    const { amount, category } = req.body;
    const parsed = Number(amount);

    if (!parsed || parsed < 50) {
      return res.status(400).json({ success: false, message: "Minimum withdrawal is ₱50." });
    }

    await client.query("BEGIN");

    const { rows: walletRows } = await client.query(
      "SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE",
      [req.user.id]
    );
    if (walletRows.length === 0 || walletRows[0].balance < parsed) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: "Insufficient wallet balance." });
    }

    await client.query(
      "UPDATE wallets SET balance = balance - $1 WHERE user_id = $2",
      [parsed, req.user.id]
    );

    const cat  = category || "gcash";
    const code = makeCode();
    await client.query(
      `INSERT INTO transactions
         (user_id, transaction_code, amount, type, category, description, status)
       VALUES ($1, $2, $3, 'withdrawal', $4, $5, 'pending')`,
      [req.user.id, code, parsed, cat, `Withdrawal to ${cat.toUpperCase()}`]
    );

    await client.query("COMMIT");

    const { rows: updated } = await client.query(
      "SELECT balance FROM wallets WHERE user_id = $1",
      [req.user.id]
    );

    return res.status(201).json({
      success: true,
      message: "Withdrawal request submitted. Pending admin approval.",
      newBalance: updated[0].balance,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("requestWithdrawal error:", err);
    return res.status(500).json({ success: false, message: "Withdrawal request failed." });
  } finally {
    client.release();
  }
};

// ── POST /api/wallet/pay-fee ──────────────────────────────────
const payFee = async (req, res) => {
  const client = await pool.connect();
  try {
    const { feeId, amount } = req.body;
    const parsed = Number(amount);

    if (!feeId || !parsed || parsed < 1) {
      return res.status(400).json({ success: false, message: "Fee ID and valid amount are required." });
    }

    await client.query("BEGIN");

    const { rows: feeRows } = await client.query(
      "SELECT * FROM fees WHERE id = $1 AND user_id = $2",
      [feeId, req.user.id]
    );
    if (feeRows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Fee not found." });
    }

    const fee       = feeRows[0];
    const remaining = Number(fee.total_amount) - Number(fee.paid_amount);
    if (parsed > remaining) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: `Amount exceeds remaining balance of ₱${remaining}.` });
    }

    const { rows: walletRows } = await client.query(
      "SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE",
      [req.user.id]
    );
    if (walletRows.length === 0 || walletRows[0].balance < parsed) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: "Insufficient wallet balance." });
    }

    await client.query(
      "UPDATE wallets SET balance = balance - $1 WHERE user_id = $2",
      [parsed, req.user.id]
    );

    const code = makeCode();
    const { rows: txRows } = await client.query(
      `INSERT INTO transactions
         (user_id, transaction_code, amount, type, category, description, status)
       VALUES ($1, $2, $3, 'payment', $4, $5, 'pending')
       RETURNING id`,
      [req.user.id, code, parsed, fee.type, `${fee.label} Payment`]
    );

    await client.query("COMMIT");

    const { rows: updated } = await client.query(
      "SELECT balance FROM wallets WHERE user_id = $1",
      [req.user.id]
    );

    return res.status(201).json({
      success: true,
      message: "Payment submitted. Pending admin verification.",
      transactionId: txRows[0].id,
      newBalance:    updated[0].balance,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("payFee error:", err);
    return res.status(500).json({ success: false, message: "Payment failed." });
  } finally {
    client.release();
  }
};

module.exports = { getBalance, requestTopup, requestWithdrawal, payFee };