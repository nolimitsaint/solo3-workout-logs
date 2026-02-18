c// backend/src/controllers/workouts.controller.js
const pool = require("../db/pool");

// helper: only allow certain sort columns (prevents SQL injection)
const ALLOWED_SORTS = new Set([
  "workout_date",
  "created_at",
  "duration_min",
  "title",
  "category",
]);

function toInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

exports.listWorkouts = async (req, res) => {
  try {
    const search = (req.query.search || "").trim();
    const sort = (req.query.sort || "workout_date").trim();
    const order = (req.query.order || "desc").toLowerCase() === "asc" ? "ASC" : "DESC";

    const page = toInt(req.query.page, 1);

    // cookie page size fallback (required feature)
    const cookiePageSize = toInt(req.cookies?.pageSize, 10);
    const pageSize = toInt(req.query.pageSize, cookiePageSize || 10);

    // store pageSize in cookie if user passes it in query
    if (req.query.pageSize) {
      res.cookie("pageSize", String(pageSize), {
        httpOnly: false,
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
      });
    }

    const safeSort = ALLOWED_SORTS.has(sort) ? sort : "workout_date";
    const offset = (page - 1) * pageSize;

    // Build WHERE with $ params
    const params = [];
    let where = "";

    if (search) {
      const like = `%${search}%`;
      params.push(like, like, like);
      where = `WHERE title ILIKE $1 OR category ILIKE $2 OR COALESCE(notes,'') ILIKE $3`;
    }

    // total count
    const countSql = `SELECT COUNT(*)::int AS total FROM workouts ${where}`;
    const countResult = await pool.query(countSql, params);
    const total = countResult.rows[0]?.total ?? 0;

    // page results
    const limitParamIndex = params.length + 1;
    const offsetParamIndex = params.length + 2;

    const listSql = `
      SELECT *
      FROM workouts
      ${where}
      ORDER BY ${safeSort} ${order}
      LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
    `;

    const listResult = await pool.query(listSql, [...params, pageSize, offset]);

    res.json({
      ok: true,
      page,
      pageSize,
      total,
      results: listResult.rows,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

exports.getWorkout = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    const result = await pool.query("SELECT * FROM workouts WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Not found" });
    }

    res.json({ ok: true, workout: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

exports.createWorkout = async (req, res) => {
  try {
    const { title, workout_date, category, duration_min, notes, image_url } = req.body;

    if (!title || !workout_date || !category || duration_min == null) {
      return res.status(400).json({ ok: false, error: "Missing required fields" });
    }

    const insertSql = `
      INSERT INTO workouts (title, workout_date, category, duration_min, notes, image_url)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await pool.query(insertSql, [
      title,
      workout_date,
      category,
      duration_min,
      notes || null,
      image_url || null,
    ]);

    res.status(201).json({ ok: true, workout: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

exports.updateWorkout = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { title, workout_date, category, duration_min, notes, image_url } = req.body;

    const existing = await pool.query("SELECT * FROM workouts WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Not found" });
    }

    const w = existing.rows[0];

    const next = {
      title: title ?? w.title,
      workout_date: workout_date ?? w.workout_date,
      category: category ?? w.category,
      duration_min: duration_min ?? w.duration_min,
      notes: notes ?? w.notes,
      image_url: image_url ?? w.image_url,
    };

    const updateSql = `
      UPDATE workouts
      SET title=$1, workout_date=$2, category=$3, duration_min=$4, notes=$5, image_url=$6, updated_at=NOW()
      WHERE id=$7
      RETURNING *
    `;

    const result = await pool.query(updateSql, [
      next.title,
      next.workout_date,
      next.category,
      next.duration_min,
      next.notes,
      next.image_url,
      id,
    ]);

    res.json({ ok: true, workout: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

exports.deleteWorkout = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    const result = await pool.query("DELETE FROM workouts WHERE id = $1", [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, error: "Not found" });
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

exports.uploadWorkoutImage = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    const existing = await pool.query("SELECT * FROM workouts WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Not found" });
    }

    if (!req.file) {
      return res.status(400).json({ ok: false, error: "No file uploaded" });
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    const result = await pool.query(
      "UPDATE workouts SET image_url = $1, updated_at=NOW() WHERE id = $2 RETURNING *",
      [imageUrl, id]
    );

    res.json({ ok: true, workout: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    // total records
    const totalResult = await pool.query("SELECT COUNT(*)::int AS total FROM workouts");
    const totalRecords = totalResult.rows[0]?.total ?? 0;

    // page size from cookie (if any)
    const pageSize = toInt(req.cookies?.pageSize, 10);

    // domain stats
    const statsResult = await pool.query(`
      SELECT
        COALESCE(SUM(duration_min), 0)::int AS "totalMinutes",
        COALESCE(AVG(duration_min), 0) AS "avgDuration",
        COALESCE(COUNT(DISTINCT category), 0)::int AS "categoryCount",
        COALESCE(MAX(duration_min), 0)::int AS "longestWorkout",
        COALESCE(MIN(duration_min), 0)::int AS "shortestWorkout"
      FROM workouts
    `);

    const categoryCountsResult = await pool.query(`
      SELECT category, COUNT(*)::int AS count
      FROM workouts
      GROUP BY category
      ORDER BY count DESC
    `);

    const s = statsResult.rows[0];

    res.json({
      ok: true,
      stats: {
        totalRecords,
        currentPageSize: pageSize || 10,
        totalMinutes: s.totalMinutes,
        avgDuration: Math.round(Number(s.avgDuration || 0)),
        categoryCount: s.categoryCount,
        longestWorkout: s.longestWorkout,
        shortestWorkout: s.shortestWorkout,
        categoryBreakdown: categoryCountsResult.rows,
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};
