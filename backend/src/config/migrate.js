require("dotenv").config();
const { pool, connectDB } = require("../config/db");

const migrate = async () => {
  await connectDB();

  // In PostgreSQL (pg library), we get a client from the pool directly.
  // There is no pool.getConnection() — it's pool.connect() instead.
  const client = await pool.connect();

  try {
    console.log("🔧 Running migrations...\n");

    // ── users ────────────────────────────────────────────────
    // Changes:
    //   INT UNSIGNED AUTO_INCREMENT  →  SERIAL (auto-incrementing integer)
    //   ENUM('student','admin')      →  VARCHAR(20) CHECK (role IN (...))
    //   DATETIME                     →  TIMESTAMPTZ (timestamp with time zone)
    //   ON UPDATE CURRENT_TIMESTAMP  →  Not supported natively; omitted here
    //     (we'll update updated_at manually in controllers when needed)
    //   ENGINE=InnoDB DEFAULT CHARSET=utf8mb4  →  removed (not needed in Postgres)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id          SERIAL PRIMARY KEY,
        name        VARCHAR(150)  NOT NULL,
        email       VARCHAR(255)  NOT NULL UNIQUE,
        phone       VARCHAR(20),
        password    VARCHAR(255)  NOT NULL,
        role        VARCHAR(20)   NOT NULL DEFAULT 'student'
                      CHECK (role IN ('student', 'admin')),
        student_id  VARCHAR(50)   UNIQUE,
        course      VARCHAR(20)
                      CHECK (course IN ('BSIT','BSCS','BSBA','BSCE','BSED','BSACM')),
        year        SMALLINT,
        status      VARCHAR(20)   NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'suspended')),
        created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );
    `);
    console.log("  ✅ Table: users");

    // ── wallets ──────────────────────────────────────────────
    // Changes:
    //   INT UNSIGNED  →  INTEGER
    //   DECIMAL(12,2) stays the same — Postgres supports it
    //   DATETIME      →  TIMESTAMPTZ
    //   CONSTRAINT fk_wallet_user syntax is the same in Postgres ✅
    await client.query(`
      CREATE TABLE IF NOT EXISTS wallets (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER NOT NULL UNIQUE,
        balance    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_wallet_user FOREIGN KEY (user_id)
          REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    console.log("  ✅ Table: wallets");

    // ── transactions ─────────────────────────────────────────
    // Changes:
    //   INT UNSIGNED  →  INTEGER
    //   ENUM(...)     →  VARCHAR + CHECK
    //   DATETIME      →  TIMESTAMPTZ
    //   INDEX ...     →  Separate CREATE INDEX statements (Postgres doesn't
    //                    support inline INDEX inside CREATE TABLE)
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id               SERIAL PRIMARY KEY,
        transaction_code VARCHAR(40)   NOT NULL UNIQUE,
        user_id          INTEGER       NOT NULL,
        amount           DECIMAL(12,2) NOT NULL,
        type             VARCHAR(20)   NOT NULL
                           CHECK (type IN ('payment','topup','withdrawal')),
        category         VARCHAR(20)   NOT NULL
                           CHECK (category IN (
                             'tuition','lab','library','misc',
                             'gcash','maya','paymaya','bdo','metrobank','other'
                           )),
        description      VARCHAR(255)  NOT NULL,
        status           VARCHAR(20)   NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','verified','rejected')),
        rejection_reason TEXT,
        reference_number VARCHAR(100),
        verified_by      INTEGER,
        verified_at      TIMESTAMPTZ,
        created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_tx_user     FOREIGN KEY (user_id)
          REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_tx_verifier FOREIGN KEY (verified_by)
          REFERENCES users(id) ON DELETE SET NULL
      );
    `);
    // Indexes must be created separately in PostgreSQL
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tx_user_id ON transactions(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tx_status  ON transactions(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tx_created ON transactions(created_at);`);
    console.log("  ✅ Table: transactions");

    // ── fees ─────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS fees (
        id            SERIAL PRIMARY KEY,
        user_id       INTEGER       NOT NULL,
        type          VARCHAR(20)   NOT NULL
                        CHECK (type IN ('tuition','lab','library','misc')),
        label         VARCHAR(100)  NOT NULL,
        total_amount  DECIMAL(12,2) NOT NULL,
        paid_amount   DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        semester      VARCHAR(50)   NOT NULL DEFAULT '1st Semester 2024-2025',
        due_date      DATE,
        created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_fee_user FOREIGN KEY (user_id)
          REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_fee_user ON fees(user_id);`);
    console.log("  ✅ Table: fees");

    // ── payment_methods ───────────────────────────────────────
    // Changes:
    //   TINYINT(1)  →  BOOLEAN (true/false instead of 1/0)
    //   UNIQUE KEY uq_user_type (user_id, type)  →  UNIQUE(user_id, type)
    await client.query(`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id             SERIAL PRIMARY KEY,
        user_id        INTEGER      NOT NULL,
        type           VARCHAR(20)  NOT NULL
                         CHECK (type IN ('gcash','maya','paymaya','bdo','metrobank')),
        account_number VARCHAR(100) NOT NULL,
        account_name   VARCHAR(150),
        is_primary     BOOLEAN      NOT NULL DEFAULT FALSE,
        created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_pm_user FOREIGN KEY (user_id)
          REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE (user_id, type)
      );
    `);
    console.log("  ✅ Table: payment_methods");

    // ── messages ──────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id          SERIAL PRIMARY KEY,
        sender_id   INTEGER     NOT NULL,
        receiver_id INTEGER     NOT NULL,
        message     TEXT        NOT NULL,
        role        VARCHAR(20) NOT NULL
                      CHECK (role IN ('student','admin')),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_msg_sender   FOREIGN KEY (sender_id)
          REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_msg_receiver FOREIGN KEY (receiver_id)
          REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_msg_sender   ON messages(sender_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_msg_receiver ON messages(receiver_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_msg_created  ON messages(created_at);`);
    console.log("  ✅ Table: messages");

    console.log("\n✅ All migrations complete.");
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  } finally {
    // Release client back to the pool — same concept as MySQL's conn.release()
    client.release();
    process.exit(0);
  }
};

migrate();