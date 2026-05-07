const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const { pool } = require("../config/db");

// ── Helpers ──────────────────────────────────────────────────
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

// Strip sensitive fields before sending to client
const safeUser = (row) => {
  const { password, ...rest } = row;
  return rest;
};

const DEFAULT_FEES = [
  { type: "tuition",  label: "Tuition Fee",      total_amount: 10000 },
  { type: "lab",      label: "Laboratory Fee",    total_amount: 1500  },
  { type: "library",  label: "Library Fee",       total_amount: 500   },
  { type: "misc",     label: "Miscellaneous Fee", total_amount: 500   },
];

// ── POST /api/auth/register ───────────────────────────────────
// SECURITY: role is ALWAYS forced to "student" — never from request body
const register = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { name, email, phone, password } = req.body;

    // ── Input validation ──────────────────────────────────
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required.",
      });
    }

    // Basic email format check
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }

    if (name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Name must be at least 2 characters.",
      });
    }

    // ── Check duplicate email ─────────────────────────────
    const [existing] = await conn.query(
      "SELECT id FROM users WHERE email = ?",
      [email.toLowerCase().trim()]
    );
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "This email is already registered.",
      });
    }

    // ── Auto-generate student ID ──────────────────────────
    const [countRes] = await conn.query(
      "SELECT COUNT(*) AS cnt FROM users WHERE role = 'student'"
    );
    const count = countRes[0].cnt;
    const studentId = `UC-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;

    // ── Hash password (cost 12 is strong but not too slow) ─
    const hashed = await bcrypt.hash(password, 12);

    const dueDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 10);

    await conn.beginTransaction();

    // Insert user — role hardcoded to 'student'
    const [userRes] = await conn.query(
      `INSERT INTO users (name, email, phone, password, role, student_id)
       VALUES (?, ?, ?, ?, 'student', ?)`,
      [name.trim(), email.toLowerCase().trim(), phone?.trim() || null, hashed, studentId]
    );
    const userId = userRes.insertId;

    // Create wallet
    await conn.query(
      "INSERT INTO wallets (user_id, balance) VALUES (?, 0)",
      [userId]
    );

    // Assign default fees
    for (const fee of DEFAULT_FEES) {
      await conn.query(
        `INSERT INTO fees (user_id, type, label, total_amount, due_date)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, fee.type, fee.label, fee.total_amount, dueDate]
      );
    }

    await conn.commit();

    // Fetch the created user (without password)
    const [newUser] = await conn.query(
      "SELECT id, name, email, phone, role, student_id, status, created_at FROM users WHERE id = ?",
      [userId]
    );

    const token = generateToken(userId);

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      token,
      user: newUser[0],
    });
  } catch (err) {
    await conn.rollback();
    console.error("Register error:", err);
    return res.status(500).json({ success: false, message: "Registration failed. Please try again." });
  } finally {
    conn.release();
  }
};

// ── POST /api/auth/login ──────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    // Fetch user including password for comparison
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE email = ?",
      [email.toLowerCase().trim()]
    );

    // SECURITY: same generic message whether user not found or wrong password
    // (prevents email enumeration)
    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const user = rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (user.status === "suspended") {
      return res.status(403).json({
        success: false,
        message: "Your account has been suspended. Please contact admin.",
      });
    }

    const token = generateToken(user.id);

    return res.json({
      success: true,
      message: "Login successful.",
      token,
      user: safeUser(user),
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ success: false, message: "Login failed. Please try again." });
  }
};

// ── GET /api/auth/me ──────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const [userRows] = await pool.query(
      "SELECT id, name, email, phone, role, student_id, course, year, status, created_at FROM users WHERE id = ?",
      [req.user.id]
    );
    const [walletRows] = await pool.query(
      "SELECT balance FROM wallets WHERE user_id = ?",
      [req.user.id]
    );

    return res.json({
      success: true,
      user: userRows[0],
      walletBalance: walletRows[0]?.balance || 0,
    });
  } catch (err) {
    console.error("getMe error:", err);
    return res.status(500).json({ success: false, message: "Could not fetch profile." });
  }
};

// ── PUT /api/auth/change-password ─────────────────────────────
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current and new passwords are required.",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters.",
      });
    }

    const [rows] = await pool.query(
      "SELECT password FROM users WHERE id = ?",
      [req.user.id]
    );

    const isMatch = await bcrypt.compare(currentPassword, rows[0].password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await pool.query("UPDATE users SET password = ? WHERE id = ?", [hashed, req.user.id]);

    return res.json({ success: true, message: "Password changed successfully." });
  } catch (err) {
    console.error("changePassword error:", err);
    return res.status(500).json({ success: false, message: "Could not change password." });
  }
};

module.exports = { register, login, getMe, changePassword };
