const { pool } = require("../config/db");

const makeCode = () => {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(Math.random() * 90000) + 10000;
  return `TXN-${d}-${rand}`;
};

const getBalance = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT balance FROM wallets WHERE user_id = ?",
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

// Top-up should be credited instantly.
const requestTopup = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { amount, category, referenceNumber } = req.body;
    const parsed = Number(amount);

    if (!parsed || parsed < 50) {
      return res.status(400).json({ success: false, message: "Minimum top-up amount is ₱50." });
    }
    if (parsed > 50000) {
      return res.status(400).json({ success: false, message: "Maximum top-up amount is ₱50,000." });
    }

    const valid = ["gcash", "maya", "paymaya", "bdo", "metrobank"];
    if (!valid.includes(category)) {
      return res.status(400).json({ success: false, message: "Invalid payment method." });
    }

    const code = makeCode();

    await conn.beginTransaction();
    await conn.query(
      "UPDATE wallets SET balance = balance + ? WHERE user_id = ?",
      [parsed, req.user.id]
    );

    const [result] = await conn.query(
      `INSERT INTO transactions
         (user_id, transaction_code, amount, type, category, description, status, reference_number)
       VALUES (?, ?, ?, 'topup', ?, ?, 'verified', ?)`,
      [
        req.user.id,
        code,
        parsed,
        category,
        `${category.toUpperCase()} Top-up`,
        referenceNumber?.trim() || null,
      ]
    );

    const [updated] = await conn.query(
      "SELECT balance FROM wallets WHERE user_id = ?",
      [req.user.id]
    );

    await conn.commit();

    return res.status(201).json({
      success: true,
      message: "Funds added successfully.",
      transactionId: result.insertId,
      transactionCode: code,
      newBalance: updated[0]?.balance || 0,
    });
  } catch (err) {
    await conn.rollback();
    console.error("requestTopup error:", err);
    return res.status(500).json({ success: false, message: "Top-up request failed." });
  } finally {
    conn.release();
  }
};

const requestWithdrawal = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { amount, category } = req.body;
    const parsed = Number(amount);

    if (!parsed || parsed < 50) {
      return res.status(400).json({ success: false, message: "Minimum withdrawal is ₱50." });
    }

    await conn.beginTransaction();

    const [walletRows] = await conn.query(
      "SELECT balance FROM wallets WHERE user_id = ? FOR UPDATE",
      [req.user.id]
    );

    if (walletRows.length === 0 || walletRows[0].balance < parsed) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: "Insufficient wallet balance." });
    }

    await conn.query(
      "UPDATE wallets SET balance = balance - ? WHERE user_id = ?",
      [parsed, req.user.id]
    );

    const cat = category || "gcash";
    const code = makeCode();
    await conn.query(
      `INSERT INTO transactions
         (user_id, transaction_code, amount, type, category, description, status)
       VALUES (?, ?, ?, 'withdrawal', ?, ?, 'pending')`,
      [req.user.id, code, parsed, cat, `Withdrawal to ${cat.toUpperCase()}`]
    );

    await conn.commit();

    const [updated] = await conn.query(
      "SELECT balance FROM wallets WHERE user_id = ?",
      [req.user.id]
    );

    return res.status(201).json({
      success: true,
      message: "Withdrawal request submitted. Pending admin approval.",
      newBalance: updated[0].balance,
    });
  } catch (err) {
    await conn.rollback();
    console.error("requestWithdrawal error:", err);
    return res.status(500).json({ success: false, message: "Withdrawal request failed." });
  } finally {
    conn.release();
  }
};

const payFee = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { feeId, amount } = req.body;
    const parsed = Number(amount);

    if (!feeId || !parsed || parsed < 1) {
      return res.status(400).json({ success: false, message: "Fee ID and valid amount are required." });
    }

    await conn.beginTransaction();

    const [feeRows] = await conn.query(
      "SELECT * FROM fees WHERE id = ? AND user_id = ?",
      [feeId, req.user.id]
    );
    if (feeRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: "Fee not found." });
    }

    const fee = feeRows[0];
    const remaining = Number(fee.total_amount) - Number(fee.paid_amount);
    if (parsed > remaining) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: `Amount exceeds remaining balance of ₱${remaining}.`,
      });
    }

    const [walletRows] = await conn.query(
      "SELECT balance FROM wallets WHERE user_id = ? FOR UPDATE",
      [req.user.id]
    );
    if (walletRows.length === 0 || walletRows[0].balance < parsed) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: "Insufficient wallet balance." });
    }

    await conn.query(
      "UPDATE wallets SET balance = balance - ? WHERE user_id = ?",
      [parsed, req.user.id]
    );

    const code = makeCode();
    const [txRes] = await conn.query(
      `INSERT INTO transactions
         (user_id, transaction_code, amount, type, category, description, status)
       VALUES (?, ?, ?, 'payment', ?, ?, 'pending')`,
      [req.user.id, code, parsed, fee.type, `${fee.label} Payment`]
    );

    await conn.commit();

    const [updated] = await conn.query(
      "SELECT balance FROM wallets WHERE user_id = ?",
      [req.user.id]
    );

    return res.status(201).json({
      success: true,
      message: "Payment submitted. Pending admin verification.",
      transactionId: txRes.insertId,
      newBalance: updated[0].balance,
    });
  } catch (err) {
    await conn.rollback();
    console.error("payFee error:", err);
    return res.status(500).json({ success: false, message: "Payment failed." });
  } finally {
    conn.release();
  }
};

module.exports = { getBalance, requestTopup, requestWithdrawal, payFee };
