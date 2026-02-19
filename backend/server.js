console.log("Server file loaded");

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const path = require("path");

const app = express();

// Security headers (allow images/files to be used by frontend)
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

/**
 * ✅ Serve uploads (images)
 * backend/uploads/... => available at /uploads/...
 */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/**
 * ✅ Serve frontend static files
 * frontend/index.html, frontend/app.js, frontend/style.css
 */
app.use(express.static(path.join(__dirname, "../frontend")));

/**
 * ✅ API routes
 */
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

// ✅ DB health endpoint
app.get("/api/db-health", async (req, res) => {
  try {
    const result = await pool.query("SELECT 1 AS ok");
    res.json({ ok: true, db: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * ✅ Catch-all: serve frontend for any NON-API route
 * This makes refresh work on Render.
 */
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) return next();
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});


 
