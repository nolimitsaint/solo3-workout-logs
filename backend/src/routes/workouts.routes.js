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

// MUST be before "/:id"
router.get("/stats", getStats);

router.get("/", listWorkouts);
router.post("/", createWorkout);

router.post("/:id/image", upload.single("image"), uploadWorkoutImage);

router.get("/:id", getWorkout);
router.put("/:id", updateWorkout);
router.delete("/:id", deleteWorkout);

module.exports = router;
