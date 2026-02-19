console.log("Server file loaded");

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const path = require("path");

const fs = require("fs");

const uploadsDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}


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

// ✅ paths
// If server.js is in /backend/server.js and frontend folder is /frontend
const FRONTEND_DIR = path.join(__dirname, "../frontend");
const FRONTEND_INDEX = path.join(FRONTEND_DIR, "index.html");

// Serve uploaded files (adjust if your uploads folder lives somewhere else)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Serve frontend static files (css/js)
app.use(express.static(FRONTEND_DIR));

// API routes
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

// Optional DB health endpoint
app.get("/api/db-health", async (req, res) => {
  try {
    const result = await pool.query("SELECT 1 AS ok");
    res.json({ ok: true, db: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ✅ Serve the frontend for ONLY the site root (no wildcards)
app.get("/", (req, res) => {
  res.sendFile(FRONTEND_INDEX);
});

// ✅ Final 404 handler (no "*" and no "**")
app.use((req, res) => {
  // If you want the frontend to handle unknown routes, uncomment this:
  // if (!req.path.startsWith("/api") && !req.path.startsWith("/uploads")) {
  //   return res.sendFile(FRONTEND_INDEX);
  // }

  res.status(404).json({ ok: false, error: "Route not found" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));



 
