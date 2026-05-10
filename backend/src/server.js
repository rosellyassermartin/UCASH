require("dotenv").config();

const express = require("express");
const cors    = require("cors");
const helmet  = require("helmet");
const rateLimit = require("express-rate-limit");
const { connectDB } = require("./config/db");

const authRoutes          = require("./routes/auth.routes");
const userRoutes          = require("./routes/user.routes");
const walletRoutes        = require("./routes/wallet.routes");
const transactionRoutes   = require("./routes/transaction.routes");
const paymentMethodRoutes = require("./routes/paymentMethod.routes");
const adminRoutes         = require("./routes/admin.routes");
const messageRoutes       = require("./routes/Message.routes");

const app = express();

connectDB();

app.use(helmet());

// ── Allowed origins ───────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  process.env.FRONTEND_URL,         // https://ucash-mu.vercel.app
  process.env.FRONTEND_URL_PREVIEW, // optional extra slot in Railway variables
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (Postman, mobile apps, curl)
    if (!origin) return callback(null, true);

    // Allow exact match from allowedOrigins list
    if (allowedOrigins.includes(origin)) return callback(null, true);

    // Allow ALL Vercel preview deployments for your project automatically
    // Covers URLs like: https://ucash-abc123-rosellyassermartins-projects.vercel.app
    if (/^https:\/\/ucash-.*\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }

    // Block everything else
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}));

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// ── Rate limiting (production only) ──────────────────────────
if (process.env.NODE_ENV === "production") {
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests. Please try again later." },
  });
  app.use(globalLimiter);

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many auth attempts. Please wait 15 minutes." },
  });
  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/register", authLimiter);
}

// ── Routes ────────────────────────────────────────────────────
app.use("/api/auth",            authRoutes);
app.use("/api/users",           userRoutes);
app.use("/api/wallet",          walletRoutes);
app.use("/api/transactions",    transactionRoutes);
app.use("/api/payment-methods", paymentMethodRoutes);
app.use("/api/admin",           adminRoutes);
app.use("/api/messages",        messageRoutes);

// ── Health check ──────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    success:   true,
    status:    "UCash API is running",
    timestamp: new Date(),
  });
});

// ── 404 handler ───────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

// ── Global error handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: "An unexpected error occurred. Please try again.",
  });
});

// ── Start server ──────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});