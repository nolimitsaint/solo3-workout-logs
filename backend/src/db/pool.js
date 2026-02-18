// backend/src/db/pool.js  (Postgres / Render)
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Render Postgres requires SSL
  ssl: { rejectUnauthorized: false },
});

module.exports = pool;
