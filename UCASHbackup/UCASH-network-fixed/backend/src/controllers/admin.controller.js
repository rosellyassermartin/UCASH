const { pool } = require("../config/db");
const bcrypt    = require("bcryptjs");

const safePage  = (v) => Math.max(1, parseInt(v) || 1);
const safeLimit = (v) => Math.min(100, Math.max(1, parseInt(v) || 20));

// ── GET /api/admin/stats ──────────────────────────────────────
const getDashboardStats = async (req, res) => {
  try {
    // Student counts
    const [[totals]] = await pool.query(`
      SELECT
        COUNT(*)                                            AS total_students,
        SUM(status = 'active')                             AS active_students,
        SUM(status = 'suspended')                          AS suspended_students
      FROM users WHERE role = 'student'
    `);

    // Transaction status counts
    const [[txCounts]] = await pool.query(`
      SELECT
        SUM(status = 'pending')  AS pending_transactions,
        SUM(status = 'verified') AS verified_transactions,
        SUM(status = 'rejected') AS rejected_transactions
      FROM transactions
    `);

    // Total revenue (all-time verified payments)
    const [[revTotal]] = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM transactions
      WHERE status = 'verified' AND type = 'payment'
    `);

    // This month revenue
    const [[revMonth]] = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM transactions
      WHERE status = 'verified'
        AND type = 'payment'
        AND YEAR(created_at)  = YEAR(NOW())
        AND MONTH(created_at) = MONTH(NOW())
    `);

    // Monthly revenue for past 6 months
    const [monthly] = await pool.query(`
      SELECT
        YEAR(created_at)  AS yr,
        MONTH(created_at) AS mo,
        SUM(amount)       AS total
      FROM transactions
      WHERE status = 'verified'
        AND type = 'payment'
        AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY YEAR(created_at), MONTH(created_at)
      ORDER BY yr ASC, mo ASC
    `);

    return res.json({
      success: true,
      stats: {
        totalStudents:        totals.total_students,
        activeStudents:       totals.active_students,
        suspendedStudents:    totals.suspended_students,
        pendingTransactions:  txCounts.pending_transactions  || 0,
        verifiedTransactions: txCounts.verified_transactions || 0,
        rejectedTransactions: txCounts.rejected_transactions || 0,
        totalRevenue:         revTotal.total,
        monthRevenue:         revMonth.total,
        monthlyRevenue:       monthly,
      },
    });
  } catch (err) {
    console.error("getDashboardStats error:", err);
    return res.status(500).json({ success: false, message: "Could not fetch stats." });
  }
};

// ── GET /api/admin/students ───────────────────────────────────
const getAllStudents = async (req, res) => {
  try {
    const { status, search } = req.query;
    const sortBy = req.query.sortBy || "name";
    const page   = safePage(req.query.page);
    const limit  = safeLimit(req.query.limit);
    const offset = (page - 1) * limit;

    const conditions = ["u.role = 'student'"];
    const params     = [];

    if (status) { conditions.push("u.status = ?"); params.push(status); }
    if (search) {
      const like = `%${search}%`;
      conditions.push("(u.name LIKE ? OR u.email LIKE ? OR u.student_id LIKE ?)");
      params.push(like, like, like);
    }

    const where = conditions.join(" AND ");

    // Whitelist sort columns to prevent SQL injection
    const sortMap = {
      name:      "u.name ASC",
      balance:   "w.balance DESC",
      studentId: "u.student_id ASC",
      newest:    "u.created_at DESC",
    };
    const orderBy = sortMap[sortBy] || "u.name ASC";

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM users u WHERE ${where}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone, u.role,
              u.student_id, u.course, u.year, u.status, u.created_at,
              COALESCE(w.balance, 0) AS balance
       FROM users u
       LEFT JOIN wallets w ON w.user_id = u.id
       WHERE ${where}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      students: rows,
    });
  } catch (err) {
    console.error("getAllStudents error:", err);
    return res.status(500).json({ success: false, message: "Could not fetch students." });
  }
};

// ── POST /api/admin/students ──────────────────────────────────
const createStudent = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { name, email, phone, password, studentId, course, year } = req.body;

    if (!name || !email || !password || !course || !year) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password, course, and year are required.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }

    const allowedCourses = ["BSIT", "BSCS", "BSBA", "BSCE", "BSED", "BSACM"];
    if (!allowedCourses.includes(course)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course selected.",
      });
    }

    const [existing] = await conn.query(
      "SELECT id FROM users WHERE email = ?",
      [email.toLowerCase().trim()]
    );
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered.",
      });
    }

    let finalStudentId = studentId?.trim();
    if (finalStudentId) {
      const [existingSid] = await conn.query(
        "SELECT id FROM users WHERE student_id = ?",
        [finalStudentId]
      );
      if (existingSid.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Student ID already exists.",
        });
      }
    } else {
      const [countRes] = await conn.query(
        "SELECT COUNT(*) AS cnt FROM users WHERE role = 'student'"
      );
      finalStudentId = `UC-${new Date().getFullYear()}-${String(countRes[0].cnt + 1).padStart(3, "0")}`;
    }

    const hashed = await bcrypt.hash(password, 12);

    await conn.beginTransaction();

    const [userRes] = await conn.query(
      `INSERT INTO users (name, email, phone, password, role, student_id, course, year, status)
       VALUES (?, ?, ?, ?, 'student', ?, ?, ?, 'active')`,
      [
        name.trim(),
        email.toLowerCase().trim(),
        phone?.trim() || null,
        hashed,
        finalStudentId,
        course,
        Number(year),
      ]
    );

    const userId = userRes.insertId;

    await conn.query(
      "INSERT INTO wallets (user_id, balance) VALUES (?, 0)",
      [userId]
    );

    const dueDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const defaultFees = [
      { type: "tuition", label: "Tuition Fee", total_amount: 10000 },
      { type: "lab", label: "Laboratory Fee", total_amount: 1500 },
      { type: "library", label: "Library Fee", total_amount: 500 },
      { type: "misc", label: "Miscellaneous Fee", total_amount: 500 },
    ];

    for (const fee of defaultFees) {
      await conn.query(
        `INSERT INTO fees (user_id, type, label, total_amount, due_date)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, fee.type, fee.label, fee.total_amount, dueDate]
      );
    }

    await conn.commit();

    return res.status(201).json({
      success: true,
      message: "Student created successfully.",
    });
  } catch (err) {
    await conn.rollback();
    console.error("createStudent error:", err);
    return res.status(500).json({
      success: false,
      message: "Could not create student.",
    });
  } finally {
    conn.release();
  }
};

// ── PUT /api/admin/students/:id ───────────────────────────────
const updateStudent = async (req, res) => {
  try {
    const { name, email, phone, course, year, status } = req.body;

    // Only allow updating student accounts
    const [check] = await pool.query(
      "SELECT id FROM users WHERE id = ? AND role = 'student'",
      [req.params.id]
    );
    if (check.length === 0) {
      return res.status(404).json({ success: false, message: "Student not found." });
    }

    await pool.query(
      `UPDATE users
       SET name   = COALESCE(?, name),
           email  = COALESCE(?, email),
           phone  = COALESCE(?, phone),
           course = COALESCE(?, course),
           year   = COALESCE(?, year),
           status = COALESCE(?, status)
       WHERE id = ?`,
      [name || null, email?.toLowerCase().trim() || null,
        phone?.trim() || null, course || null,
        year || null, status || null, req.params.id]
    );

    const [updated] = await pool.query(
      "SELECT id, name, email, phone, role, student_id, course, year, status FROM users WHERE id = ?",
      [req.params.id]
    );
    return res.json({ success: true, message: "Student updated.", user: updated[0] });
  } catch (err) {
    console.error("updateStudent error:", err);
    return res.status(500).json({ success: false, message: "Could not update student." });
  }
};

// ── PUT /api/admin/students/:id/suspend ──────────────────────
const suspendStudent = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, status FROM users WHERE id = ? AND role = 'student'",
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Student not found." });
    }

    const newStatus = rows[0].status === "active" ? "suspended" : "active";
    await pool.query("UPDATE users SET status = ? WHERE id = ?", [newStatus, req.params.id]);

    return res.json({
      success: true,
      message: `Student ${newStatus === "suspended" ? "suspended" : "reactivated"}.`,
      status: newStatus,
    });
  } catch (err) {
    console.error("suspendStudent error:", err);
    return res.status(500).json({ success: false, message: "Could not update student status." });
  }
};

// ── DELETE /api/admin/students/:id ───────────────────────────
const deleteStudent = async (req, res) => {
  try {
    // FK CASCADE handles wallets, fees, transactions automatically
    const [result] = await pool.query(
      "DELETE FROM users WHERE id = ? AND role = 'student'",
      [req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Student not found." });
    }
    return res.json({ success: true, message: "Student deleted." });
  } catch (err) {
    console.error("deleteStudent error:", err);
    return res.status(500).json({ success: false, message: "Could not delete student." });
  }
};

module.exports = {
  getDashboardStats,
  getAllStudents,
  createStudent,
  updateStudent,
  suspendStudent,
  deleteStudent,
};
