// backend/src/routes/workouts.routes.js
const express = require("express");
const upload = require("../middleware/upload");

const {
  listWorkouts,
  getWorkout,
  createWorkout,
  updateWorkout,
  deleteWorkout,
  uploadWorkoutImage,
  getStats,
} = require("../controllers/workouts.controller");

const router = express.Router();

// Only allow numeric ids for routes like /:id and /:id/image
function requireNumericId(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, error: "Invalid id" });
  }
  next();
}

/**
 * Multer wrapper so we NEVER hang on upload errors.
 * If multer throws (disk error, folder missing, bad file type, too large),
 * we return JSON immediately.
 */
function multerSingle(fieldName) {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (!err) return next();

      // MulterError or generic error
      const msg =
        err.code === "LIMIT_FILE_SIZE"
          ? "File too large (max 5MB)"
          : err.message || "Upload failed";

      return res.status(400).json({ ok: false, error: msg });
    });
  };
}

// Routes
router.get("/stats", getStats);
router.get("/", listWorkouts);
router.post("/", createWorkout);

// ✅ Image upload (keep BEFORE "/:id")
router.post("/:id/image", requireNumericId, multerSingle("image"), uploadWorkoutImage);

router.get("/:id", requireNumericId, getWorkout);
router.put("/:id", requireNumericId, updateWorkout);
router.delete("/:id", requireNumericId, deleteWorkout);

module.exports = router;
