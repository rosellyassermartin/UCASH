require("dotenv").config();
const { pool, connectDB } = require("./db");

const migrate = async () => {
  await connectDB();
  const conn = await pool.getConnection();

  try {
    console.log("🔧 Running migrations...\n");

    // ── users ────────────────────────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name        VARCHAR(150)  NOT NULL,
        email       VARCHAR(255)  NOT NULL UNIQUE,
        phone       VARCHAR(20),
        password    VARCHAR(255)  NOT NULL,
        role        ENUM('student','admin') NOT NULL DEFAULT 'student',
        student_id  VARCHAR(50)   UNIQUE,
        course      ENUM('BSIT','BSCS','BSBA','BSCE','BSED','BSACM'),
        year        TINYINT UNSIGNED,
        status      ENUM('active','suspended') NOT NULL DEFAULT 'active',
        created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("  ✅ Table: users");

    // ── wallets ──────────────────────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS wallets (
        id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id    INT UNSIGNED NOT NULL UNIQUE,
        balance    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_wallet_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("  ✅ Table: wallets");

    // ── transactions ─────────────────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        transaction_code VARCHAR(40)   NOT NULL UNIQUE,
        user_id          INT UNSIGNED  NOT NULL,
        amount           DECIMAL(12,2) NOT NULL,
        type             ENUM('payment','topup','withdrawal') NOT NULL,
        category         ENUM('tuition','lab','library','misc','gcash','maya','paymaya','bdo','metrobank','other') NOT NULL,
        description      VARCHAR(255)  NOT NULL,
        status           ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending',
        rejection_reason TEXT,
        reference_number VARCHAR(100),
        verified_by      INT UNSIGNED,
        verified_at      DATETIME,
        created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_tx_user     FOREIGN KEY (user_id)     REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_tx_verifier FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_tx_user_id  (user_id),
        INDEX idx_tx_status   (status),
        INDEX idx_tx_created  (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("  ✅ Table: transactions");

    // ── fees ─────────────────────────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS fees (
        id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id       INT UNSIGNED NOT NULL,
        type          ENUM('tuition','lab','library','misc') NOT NULL,
        label         VARCHAR(100) NOT NULL,
        total_amount  DECIMAL(12,2) NOT NULL,
        paid_amount   DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        semester      VARCHAR(50)  NOT NULL DEFAULT '1st Semester 2024-2025',
        due_date      DATE,
        created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_fee_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_fee_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("  ✅ Table: fees");

    // ── payment_methods ───────────────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id        INT UNSIGNED NOT NULL,
        type           ENUM('gcash','maya','paymaya','bdo','metrobank') NOT NULL,
        account_number VARCHAR(100) NOT NULL,
        account_name   VARCHAR(150),
        is_primary     TINYINT(1)  NOT NULL DEFAULT 0,
        created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_pm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY uq_user_type (user_id, type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("  ✅ Table: payment_methods");

    console.log("\n✅ All migrations complete.");
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  } finally {
    conn.release();
    process.exit(0);
  }
};

migrate();
