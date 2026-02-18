console.log("Server file loaded");

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const path = require("path");
require("dotenv").config();

const app = express();

// ✅ FIX: allow images/files to be used by your frontend on a different port (localhost:5500)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

// CORS for local dev + later your domain
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// routes AFTER middleware
const workoutsRoutes = require("./src/routes/workouts.routes");
app.use("/api/workouts", workoutsRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "Backend is running" });
});

let pool;
try {
  pool = require("./src/db/pool");
  console.log("Pool loaded successfully");
} catch (err) {
  console.error("Failed to load DB pool:", err && err.stack ? err.stack : err);
  process.exit(1);
}

// Test connection on startup
pool.getConnection()
  .then((conn) => {
    console.log("✓ Database connected");
    conn.release();
  })
  .catch((err) => {
    console.error("✗ Database connection failed:", err.code);
    console.log("Make sure MySQL is running and the database exists.");
    process.exit(1);
  });

app.get("/api/db-health", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 AS ok");
    res.json({ ok: true, db: rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});

// 404 handler (keep last)
app.use((req, res) => {
  res.status(404).json({ ok: false, error: "Route not found" });
});
