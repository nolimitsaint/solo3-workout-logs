// backend/src/db/pool.js
// MySQL connection pool (mysql2/promise) using env vars

const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "",

  // pool behavior
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  queueLimit: 0,

  // mysql2-valid options (fixes your warnings)
  connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT || 10000),
  enableKeepAlive: true,
  keepAliveInitialDelay: Number(process.env.DB_KEEPALIVE_DELAY || 0),

  // optional quality-of-life settings
  charset: "utf8mb4",
  dateStrings: true,
});

module.exports = pool;
