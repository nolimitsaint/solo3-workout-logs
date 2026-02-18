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
    const order =
      (req.query.order || "desc").toLowerCase() === "asc" ? "ASC" : "DESC";

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

    let where = "";
    const params = [];

    if (search) {
      where = `WHERE title LIKE ? OR category LIKE ? OR notes LIKE ?`;
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    // total count
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM workouts ${where}`,
      params
    );
    const total = countRows[0].total;

    // page results
    const [rows] = await pool.query(
      `SELECT *
       FROM workouts
       ${where}
       ORDER BY ${safeSort} ${order}
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    res.json({
      ok: true,
      page,
      pageSize,
      total,
      results: rows,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

exports.getWorkout = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [rows] = await pool.query("SELECT * FROM workouts WHERE id = ?", [id]);
    if (rows.length === 0)
      return res.status(404).json({ ok: false, error: "Not found" });
    res.json({ ok: true, workout: rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

exports.createWorkout = async (req, res) => {
  try {
    const { title, workout_date, category, duration_min, notes, image_url } = req.body;

    if (!title || !workout_date || !category || !duration_min) {
      return res.status(400).json({ ok: false, error: "Missing required fields" });
    }

    const [result] = await pool.query(
      `INSERT INTO workouts (title, workout_date, category, duration_min, notes, image_url)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, workout_date, category, duration_min, notes || null, image_url || null]
    );

    const [rows] = await pool.query("SELECT * FROM workouts WHERE id = ?", [
      result.insertId,
    ]);
    res.status(201).json({ ok: true, workout: rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

exports.updateWorkout = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { title, workout_date, category, duration_min, notes, image_url } = req.body;

    const [existing] = await pool.query("SELECT * FROM workouts WHERE id = ?", [id]);
    if (existing.length === 0)
      return res.status(404).json({ ok: false, error: "Not found" });

    const w = existing[0];

    const next = {
      title: title ?? w.title,
      workout_date: workout_date ?? w.workout_date,
      category: category ?? w.category,
      duration_min: duration_min ?? w.duration_min,
      notes: notes ?? w.notes,
      image_url: image_url ?? w.image_url,
    };

    await pool.query(
      `UPDATE workouts
       SET title=?, workout_date=?, category=?, duration_min=?, notes=?, image_url=?
       WHERE id=?`,
      [
        next.title,
        next.workout_date,
        next.category,
        next.duration_min,
        next.notes,
        next.image_url,
        id,
      ]
    );

    const [rows] = await pool.query("SELECT * FROM workouts WHERE id = ?", [id]);
    res.json({ ok: true, workout: rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

exports.deleteWorkout = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [result] = await pool.query("DELETE FROM workouts WHERE id = ?", [id]);
    if (result.affectedRows === 0)
      return res.status(404).json({ ok: false, error: "Not found" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

exports.uploadWorkoutImage = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    const [existing] = await pool.query("SELECT * FROM workouts WHERE id = ?", [id]);
    if (existing.length === 0)
      return res.status(404).json({ ok: false, error: "Not found" });

    if (!req.file)
      return res.status(400).json({ ok: false, error: "No file uploaded" });

    const imageUrl = `/uploads/${req.file.filename}`;

    await pool.query("UPDATE workouts SET image_url = ? WHERE id = ?", [imageUrl, id]);

    const [rows] = await pool.query("SELECT * FROM workouts WHERE id = ?", [id]);
    res.json({ ok: true, workout: rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    // total records
    const [totalRows] = await pool.query("SELECT COUNT(*) AS total FROM workouts");
    const totalRecords = totalRows[0].total;

    // page size from cookie (if any)
    const pageSize = toInt(req.cookies?.pageSize, 10);

    // domain stats
    const [stats] = await pool.query(`
      SELECT 
        SUM(duration_min) AS totalMinutes,
        AVG(duration_min) AS avgDuration,
        COUNT(DISTINCT category) AS categoryCount,
        MAX(duration_min) AS longestWorkout,
        MIN(duration_min) AS shortestWorkout
      FROM workouts
    `);

    const [categoryCounts] = await pool.query(`
      SELECT category, COUNT(*) AS count
      FROM workouts
      GROUP BY category
      ORDER BY count DESC
    `);

    res.json({
      ok: true,
      stats: {
        totalRecords,
        currentPageSize: pageSize || 10,
        totalMinutes: stats[0].totalMinutes || 0,
        avgDuration: Math.round(stats[0].avgDuration || 0),
        categoryCount: stats[0].categoryCount || 0,
        longestWorkout: stats[0].longestWorkout || 0,
        shortestWorkout: stats[0].shortestWorkout || 0,
        categoryBreakdown: categoryCounts,
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};
