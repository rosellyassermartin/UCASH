const { pool } = require("../config/db");
const bcrypt    = require("bcryptjs");

const safePage  = (v) => Math.max(1, parseInt(v) || 1);
const safeLimit = (v) => Math.min(100, Math.max(1, parseInt(v) || 20));

// ── GET /api/admin/stats ──────────────────────────────────────
const getDashboardStats = async (req, res) => {
  try {
    // ── Student counts ──────────────────────────────────────
    // MySQL: SUM(status = 'active') works because MySQL treats boolean as 0/1
    // PostgreSQL: must use CASE WHEN ... THEN 1 ELSE 0 END instead
    const { rows: totalsRows } = await pool.query(`
      SELECT
        COUNT(*)                                                        AS total_students,
        SUM(CASE WHEN status = 'active'    THEN 1 ELSE 0 END)          AS active_students,
        SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END)          AS suspended_students
      FROM users WHERE role = 'student'
    `);
    const totals = totalsRows[0];

    // ── Transaction status counts ───────────────────────────
    const { rows: txRows } = await pool.query(`
      SELECT
        SUM(CASE WHEN status = 'pending'  THEN 1 ELSE 0 END) AS pending_transactions,
        SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) AS verified_transactions,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected_transactions
      FROM transactions
    `);
    const txCounts = txRows[0];

    // ── Total revenue ───────────────────────────────────────
    const { rows: revTotalRows } = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM transactions
      WHERE status = 'verified' AND type = 'payment'
    `);

    // ── This month revenue ──────────────────────────────────
    // MySQL: YEAR(col) / MONTH(col)
    // PostgreSQL: EXTRACT(YEAR FROM col) / EXTRACT(MONTH FROM col)
    const { rows: revMonthRows } = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM transactions
      WHERE status = 'verified'
        AND type = 'payment'
        AND EXTRACT(YEAR  FROM created_at) = EXTRACT(YEAR  FROM NOW())
        AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM NOW())
    `);

    // ── Monthly revenue for past 6 months ──────────────────
    // MySQL: DATE_SUB(NOW(), INTERVAL 6 MONTH)
    // PostgreSQL: NOW() - INTERVAL '6 months'
    const { rows: monthly } = await pool.query(`
      SELECT
        EXTRACT(YEAR  FROM created_at) AS yr,
        EXTRACT(MONTH FROM created_at) AS mo,
        SUM(amount) AS total
      FROM transactions
      WHERE status = 'verified'
        AND type = 'payment'
        AND created_at >= NOW() - INTERVAL '6 months'
      GROUP BY
        EXTRACT(YEAR  FROM created_at),
        EXTRACT(MONTH FROM created_at)
      ORDER BY yr ASC, mo ASC
    `);

    return res.json({
      success: true,
      stats: {
        totalStudents:        Number(totals.total_students),
        activeStudents:       Number(totals.active_students),
        suspendedStudents:    Number(totals.suspended_students),
        pendingTransactions:  Number(txCounts.pending_transactions)  || 0,
        verifiedTransactions: Number(txCounts.verified_transactions) || 0,
        rejectedTransactions: Number(txCounts.rejected_transactions) || 0,
        totalRevenue:         revTotalRows[0].total,
        monthRevenue:         revMonthRows[0].total,
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

    // PostgreSQL uses $1, $2... so we track the index manually
    let paramIndex = 1;

    if (status) {
      conditions.push(`u.status = $${paramIndex++}`);
      params.push(status);
    }
    if (search) {
      const like = `%${search}%`;
      conditions.push(
        `(u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex + 1} OR u.student_id ILIKE $${paramIndex + 2})`
        // ILIKE = case-insensitive LIKE in PostgreSQL (MySQL LIKE is already case-insensitive)
      );
      params.push(like, like, like);
      paramIndex += 3;
    }

    const where = conditions.join(" AND ");

    const sortMap = {
      name:      "u.name ASC",
      balance:   "w.balance DESC",
      studentId: "u.student_id ASC",
      newest:    "u.created_at DESC",
    };
    const orderBy = sortMap[sortBy] || "u.name ASC";

    // COUNT query — no extra params beyond existing conditions
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) AS total FROM users u WHERE ${where}`,
      params
    );
    const total = Number(countRows[0].total);

    // Main data query — append LIMIT and OFFSET as next numbered params
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone, u.role,
              u.student_id, u.course, u.year, u.status, u.created_at,
              COALESCE(w.balance, 0) AS balance
       FROM users u
       LEFT JOIN wallets w ON w.user_id = u.id
       WHERE ${where}
       ORDER BY ${orderBy}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
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
  const client = await pool.connect(); // pool.connect() instead of pool.getConnection()
  try {
    const { name, email, phone, password, studentId, course, year } = req.body;

    if (!name || !email || !password || !course || !year) {
      return res.status(400).json({ success: false, message: "Name, email, password, course, and year are required." });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
    }

    const allowedCourses = ["BSIT", "BSCS", "BSBA", "BSCE", "BSED", "BSACM"];
    if (!allowedCourses.includes(course)) {
      return res.status(400).json({ success: false, message: "Invalid course selected." });
    }

    const { rows: existing } = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [email.toLowerCase().trim()]
    );
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: "Email is already registered." });
    }

    let finalStudentId = studentId?.trim();
    if (finalStudentId) {
      const { rows: existingSid } = await client.query(
        "SELECT id FROM users WHERE student_id = $1",
        [finalStudentId]
      );
      if (existingSid.length > 0) {
        return res.status(409).json({ success: false, message: "Student ID already exists." });
      }
    } else {
      const { rows: countRes } = await client.query(
        "SELECT COUNT(*) AS cnt FROM users WHERE role = 'student'"
      );
      // COUNT(*) returns a string in pg — wrap with Number()
      finalStudentId = `UC-${new Date().getFullYear()}-${String(Number(countRes[0].cnt) + 1).padStart(3, "0")}`;
    }

    const hashed = await bcrypt.hash(password, 12);

    await client.query("BEGIN");

    // RETURNING id to get the new user's id (no insertId in pg)
    const { rows: userRows } = await client.query(
      `INSERT INTO users (name, email, phone, password, role, student_id, course, year, status)
       VALUES ($1, $2, $3, $4, 'student', $5, $6, $7, 'active')
       RETURNING id`,
      [name.trim(), email.toLowerCase().trim(), phone?.trim() || null, hashed, finalStudentId, course, Number(year)]
    );
    const userId = userRows[0].id;

    await client.query(
      "INSERT INTO wallets (user_id, balance) VALUES ($1, 0)",
      [userId]
    );

    const dueDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const defaultFees = [
      { type: "tuition", label: "Tuition Fee",      total_amount: 10000 },
      { type: "lab",     label: "Laboratory Fee",   total_amount: 1500  },
      { type: "library", label: "Library Fee",      total_amount: 500   },
      { type: "misc",    label: "Miscellaneous Fee", total_amount: 500  },
    ];

    for (const fee of defaultFees) {
      await client.query(
        `INSERT INTO fees (user_id, type, label, total_amount, due_date)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, fee.type, fee.label, fee.total_amount, dueDate]
      );
    }

    await client.query("COMMIT");

    return res.status(201).json({ success: true, message: "Student created successfully." });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("createStudent error:", err);
    return res.status(500).json({ success: false, message: "Could not create student." });
  } finally {
    client.release();
  }
};

// ── PUT /api/admin/students/:id ───────────────────────────────
const updateStudent = async (req, res) => {
  try {
    const { name, email, phone, course, year, status } = req.body;

    const { rows: check } = await pool.query(
      "SELECT id FROM users WHERE id = $1 AND role = 'student'",
      [req.params.id]
    );
    if (check.length === 0) {
      return res.status(404).json({ success: false, message: "Student not found." });
    }

    // COALESCE works the same in PostgreSQL ✅
    await pool.query(
      `UPDATE users
       SET name       = COALESCE($1, name),
           email      = COALESCE($2, email),
           phone      = COALESCE($3, phone),
           course     = COALESCE($4, course),
           year       = COALESCE($5, year),
           status     = COALESCE($6, status),
           updated_at = NOW()
       WHERE id = $7`,
      [
        name || null,
        email?.toLowerCase().trim() || null,
        phone?.trim() || null,
        course || null,
        year || null,
        status || null,
        req.params.id,
      ]
    );

    const { rows: updated } = await pool.query(
      "SELECT id, name, email, phone, role, student_id, course, year, status FROM users WHERE id = $1",
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
    const { rows } = await pool.query(
      "SELECT id, status FROM users WHERE id = $1 AND role = 'student'",
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Student not found." });
    }

    const newStatus = rows[0].status === "active" ? "suspended" : "active";
    await pool.query(
      "UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2",
      [newStatus, req.params.id]
    );

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
    // result.rowCount instead of result.affectedRows
    const result = await pool.query(
      "DELETE FROM users WHERE id = $1 AND role = 'student'",
      [req.params.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Student not found." });
    }
    return res.json({ success: true, message: "Student deleted." });
  } catch (err) {
    console.error("deleteStudent error:", err);
    return res.status(500).json({ success: false, message: "Could not delete student." });
  }
};

module.exports = { getDashboardStats, getAllStudents, createStudent, updateStudent, suspendStudent, deleteStudent };