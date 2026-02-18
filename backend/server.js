console.log("Server file loaded");

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const path = require("path");

const app = express();

// allow images/files to be used by your frontend on a different domain/port
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

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

// Load Postgres pool
let pool;
try {
  pool = require("./src/db/pool");
  console.log("Pool loaded successfully");
} catch (err) {
  console.error("Failed to load DB pool:", err?.stack || err);
  process.exit(1);
}

// ✅ Postgres connection test on startup (NO getConnection)
pool
  .query("SELECT 1")
  .then(() => {
    console.log("✓ Database connected");
  })
  .catch((err) => {
    console.error("✗ Database connection failed:", err.message);
    process.exit(1);
  });

// ✅ DB health endpoint (pg returns result.rows)
app.get("/api/db-health", async (req, res) => {
  try {
    const result = await pool.query("SELECT 1 AS ok");
    res.json({ ok: true, db: result.rows[0] });
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
