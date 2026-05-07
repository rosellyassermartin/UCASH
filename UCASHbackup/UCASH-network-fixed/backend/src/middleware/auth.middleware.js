const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");

// ── Verify JWT and attach req.user ───────────────────────────
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. No token provided.",
      });
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({
        success: false,
        message: "Not authorized. Token is invalid or expired.",
      });
    }

    const [rows] = await pool.query(
      "SELECT id, name, email, phone, role, student_id, course, year, status FROM users WHERE id = ?",
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists.",
      });
    }

    const user = rows[0];

    if (user.status === "suspended") {
      return res.status(403).json({
        success: false,
        message: "Your account has been suspended. Contact admin.",
      });
    }

    req.user = user;
    next();
  } catch {
    return res.status(500).json({
      success: false,
      message: "Authentication error.",
    });
  }
};

// ── Role guard ───────────────────────────────────────────────
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action.",
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
