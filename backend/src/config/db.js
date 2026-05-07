require("dotenv").config();
const { Pool } = require("pg");

// ── Validate required env vars on startup ────────────────────
const required = ["DATABASE_URL", "JWT_SECRET"];
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
// We use a single DATABASE_URL connection string (Supabase provides this).
// SSL is required by Supabase in production.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Supabase hosted PostgreSQL
  },
  max: 10,              // Maximum number of connections in the pool
  idleTimeoutMillis: 30000,   // Close idle connections after 30 seconds
  connectionTimeoutMillis: 5000, // Fail fast if can't connect within 5s
});

// ── Test connection on startup ────────────────────────────────
const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log(`✅ PostgreSQL connected via Supabase`);
    client.release(); // Always release the client back to the pool
  } catch (error) {
    console.error("❌ PostgreSQL connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = { pool, connectDB };