require("dotenv").config();
const bcrypt = require("bcryptjs");
const { pool, connectDB } = require("./db");

const DEFAULT_FEES = [
  { type: "tuition",  label: "Tuition Fee",      total_amount: 10000, paid_amount: 5000 },
  { type: "lab",      label: "Laboratory Fee",    total_amount: 1500,  paid_amount: 1000 },
  { type: "library",  label: "Library Fee",       total_amount: 500,   paid_amount: 350  },
  { type: "misc",     label: "Miscellaneous Fee", total_amount: 500,   paid_amount: 500  },
];

const seed = async () => {
  await connectDB();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
    console.log("🌱 Seeding UCash MySQL database...\n");

    // Clear in correct FK order
    await conn.query("DELETE FROM payment_methods");
    await conn.query("DELETE FROM fees");
    await conn.query("DELETE FROM transactions");
    await conn.query("DELETE FROM wallets");
    await conn.query("DELETE FROM users");
    await conn.query("ALTER TABLE users AUTO_INCREMENT = 1");
    console.log("  ✅ Cleared existing data");

    const hash = async (pw) => bcrypt.hash(pw, 12);
    const dueDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 10);

    // ── Admin ────────────────────────────────────────────────
    const [adminRes] = await conn.query(
      `INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, 'admin')`,
      ["Admin User", "admin@uc.edu.ph", "09991234567", await hash("admin123")]
    );
    const adminId = adminRes.insertId;
    await conn.query(`INSERT INTO wallets (user_id, balance) VALUES (?, 0)`, [adminId]);
    console.log("  ✅ Admin: admin@uc.edu.ph / admin123");

    // ── Students ─────────────────────────────────────────────
    const students = [
      { name: "Juan dela Cruz",  email: "juan@uc.edu.ph",  phone: "09171234567", pw: "student123", sid: "UC-2024-001", course: "BSIT",  year: 2, balance: 4850,  status: "active"    },
      { name: "Maria Santos",    email: "maria@uc.edu.ph", phone: "09281234567", pw: "student123", sid: "UC-2024-002", course: "BSBA",  year: 3, balance: 0,     status: "active"    },
      { name: "Pedro Reyes",     email: "pedro@uc.edu.ph", phone: "09391234567", pw: "student123", sid: "UC-2024-003", course: "BSCE",  year: 1, balance: 12000, status: "suspended" },
      { name: "Ana Gomez",       email: "ana@uc.edu.ph",   phone: "09451234567", pw: "student123", sid: "UC-2024-004", course: "BSED",  year: 4, balance: 2300,  status: "active"    },
      { name: "Carlo Diaz",      email: "carlo@uc.edu.ph", phone: "09561234567", pw: "student123", sid: "UC-2024-005", course: "BSCS",  year: 2, balance: 8000,  status: "active"    },
      { name: "Lisa Tan",        email: "lisa@uc.edu.ph",  phone: "09671234567", pw: "student123", sid: "UC-2024-006", course: "BSIT",  year: 1, balance: 1500,  status: "active"    },
      { name: "Mark Villanueva", email: "mark@uc.edu.ph",  phone: "09781234567", pw: "student123", sid: "UC-2024-007", course: "BSACM", year: 3, balance: 500,   status: "active"    },
    ];

    const studentIds = [];
    for (const s of students) {
      const [res] = await conn.query(
        `INSERT INTO users (name, email, phone, password, role, student_id, course, year, status)
         VALUES (?, ?, ?, ?, 'student', ?, ?, ?, ?)`,
        [s.name, s.email, s.phone, await hash(s.pw), s.sid, s.course, s.year, s.status]
      );
      const uid = res.insertId;
      studentIds.push(uid);

      await conn.query(
        `INSERT INTO wallets (user_id, balance) VALUES (?, ?)`,
        [uid, s.balance]
      );

      for (const fee of DEFAULT_FEES) {
        await conn.query(
          `INSERT INTO fees (user_id, type, label, total_amount, paid_amount, due_date)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [uid, fee.type, fee.label, fee.total_amount, fee.paid_amount, dueDate]
        );
      }
    }
    console.log(`  ✅ ${students.length} students created`);

    // ── Sample transactions (for Juan) ───────────────────────
    const juanId = studentIds[0];
    const txRows = [
      [juanId, "TXN-20240412-0001", 5000,  "payment",    "tuition",  "Tuition Fee Payment",    "verified", adminId],
      [juanId, "TXN-20240410-0001", 3000,  "topup",      "gcash",    "GCash Top-up",            "verified", adminId],
      [juanId, "TXN-20240408-0001", 500,   "payment",    "lab",      "Laboratory Fee Payment",  "pending",  null   ],
      [juanId, "TXN-20240405-0001", 5000,  "topup",      "bdo",      "BDO Bank Transfer",       "verified", adminId],
      [juanId, "TXN-20240403-0001", 150,   "payment",    "library",  "Library Fee Payment",     "verified", adminId],
      [juanId, "TXN-20240330-0001", 2000,  "withdrawal", "maya",     "Withdrawal to Maya",      "verified", adminId],
      // Pending for admin panel demo
      [studentIds[1], "TXN-20240414-0001", 1500,  "payment", "lab",     "Lab Fee Payment",     "pending", null],
      [studentIds[2], "TXN-20240413-0001", 3000,  "topup",   "gcash",   "GCash Top-up",        "pending", null],
      [studentIds[3], "TXN-20240413-0002", 10000, "payment", "tuition", "Tuition Fee Payment", "pending", null],
    ];

    for (const row of txRows) {
      const [uid, code, amount, type, category, desc, status, verifier] = row;
      await conn.query(
        `INSERT INTO transactions
           (user_id, transaction_code, amount, type, category, description, status, verified_by, verified_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [uid, code, amount, type, category, desc, status, verifier,
          verifier ? new Date() : null]
      );
    }
    console.log("  ✅ Sample transactions created");

    // ── GCash linked for Juan ────────────────────────────────
    await conn.query(
      `INSERT INTO payment_methods (user_id, type, account_number, account_name, is_primary)
       VALUES (?, 'gcash', '09171234567', 'Juan dela Cruz', 1)`,
      [juanId]
    );
    console.log("  ✅ Payment method linked for Juan");

    await conn.commit();
    console.log("\n──────────────────────────────────────");
    console.log("🎉 Seed complete! Demo credentials:\n");
    console.log("  Student : juan@uc.edu.ph  / student123");
    console.log("  Admin   : admin@uc.edu.ph / admin123");
    console.log("──────────────────────────────────────\n");
  } catch (err) {
    await conn.rollback();
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  } finally {
    conn.release();
    process.exit(0);
  }
};

seed();
