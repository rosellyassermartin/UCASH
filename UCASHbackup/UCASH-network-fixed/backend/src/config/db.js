const mysql = require("mysql2/promise");

// ── Validate required env vars on startup ────────────────────
const required = ["DB_HOST", "DB_USER", "DB_NAME", "JWT_SECRET"];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`❌ Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

if (process.env.JWT_SECRET.length < 32) {
  console.error("❌ JWT_SECRET must be at least 32 characters long.");
  process.exit(1);
}

// ── Create connection pool ────────────────────────────────────
const pool = mysql.createPool({
  host:               process.env.DB_HOST,
  port:               Number(process.env.DB_PORT) || 3306,
  user:               process.env.DB_USER,
  password:           process.env.DB_PASSWORD,
  database:           process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  // Return JS Date objects for DATETIME columns
  dateStrings:        false,
  // Automatically parse numbers correctly
  decimalNumbers:     true,
});

// ── Test connection on startup ────────────────────────────────
const connectDB = async () => {
  try {
    const conn = await pool.getConnection();
    console.log(`✅ MySQL connected: ${process.env.DB_HOST}/${process.env.DB_NAME}`);
    conn.release();
  } catch (error) {
    console.error("❌ MySQL connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = { pool, connectDB };
