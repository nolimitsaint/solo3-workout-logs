// seed.js (POSTGRES + IMAGES)
require("dotenv").config();
const pool = require("./src/db/pool");

const workoutCategories = [
  "Cardio", "Strength", "Yoga", "HIIT", "Pilates",
  "Crossfit", "Running", "Swimming", "Cycling", "Walking"
];

const workoutTitles = [
  "Morning Run", "Evening Yoga Flow", "Full Body Strength",
  "HIIT Blast", "Core Crusher", "Leg Day", "Upper Body Pump",
  "Cardio Kickboxing", "Powerlifting Session", "Interval Training",
  "Recovery Yoga", "Bootcamp Workout", "Spin Class",
  "Pool Laps", "Trail Run", "Kettlebell Workout",
  "Boxing Training", "Mountain Bike Ride", "Rowing Machine",
  "Functional Training"
];

const imageUrls = [
  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400",
  "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400",
  "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400",
  "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400",
  "https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=400",
  "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400",
  "https://images.unsplash.com/photo-1554284126-aa88f22d8b74?w=400",
  "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400",
  "https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=400",
  "https://images.unsplash.com/photo-1552196563-55cd4e45efb3?w=400"
];

const noteTemplates = [
  "Warm-up: 5 min cardio. Focused on controlled tempo.",
  "Kept rest between 60–90 seconds. Felt strong today.",
  "Increased weight slightly from last week.",
  "Focused on full range of motion and clean reps.",
  "Supersets today. Great pump by the final set.",
  "Interval training: 30s hard / 90s easy x 8 rounds.",
  "Core finisher added at the end of session.",
  "Deload session. Lighter weight, perfect form.",
  "Steady-state cardio. Maintained consistent pace.",
  "Long session. Hydration made a big difference.",
  "Tried a new variation today — felt smoother.",
  "Tempo work: 3 seconds down, 1 second up.",
  "Mobility work included post-session stretch.",
  "PR attempt day — solid progress.",
  "Recovery-focused workout. Light but effective."
];

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seedDatabase() {
  try {
    console.log("Clearing old data...");
    await pool.query("DELETE FROM workouts");

    console.log("Seeding Postgres database with images...");

    for (let i = 0; i < 40; i++) {
      const title = workoutTitles[randomInt(0, workoutTitles.length - 1)];
      const category = workoutCategories[randomInt(0, workoutCategories.length - 1)];
      const workout_date = randomDate(new Date(2024, 0, 1), new Date());
      const duration = randomInt(20, 90);
      const image = imageUrls[randomInt(0, imageUrls.length - 1)];

      await pool.query(
        `INSERT INTO workouts 
         (title, workout_date, category, duration_min, notes, image_url)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          title,
          workout_date,
          category,
          duration,
          "Seeded workout entry",
          image
        ]
      );
    }

    console.log("✅ Inserted 40 workouts with images");
    process.exit();
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  }
}

seedDatabase();
