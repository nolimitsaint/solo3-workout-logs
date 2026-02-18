// seed.js
require("dotenv").config();
const mysql = require("mysql2/promise");

const workoutCategories = [
  "Cardio", "Strength", "Yoga", "HIIT", "Pilates",
  "Crossfit", "Running", "Swimming", "Cycling", "Walking",
];

const workoutTitles = [
  "Morning Run", "Evening Yoga Flow", "Full Body Strength", "HIIT Blast",
  "Core Crusher", "Leg Day", "Upper Body Pump", "Cardio Kickboxing",
  "Sunrise Stretch", "Powerlifting Session", "Interval Training",
  "Recovery Yoga", "Bootcamp Workout", "Spin Class", "Pool Laps",
  "Trail Run", "Bodyweight Circuit", "Kettlebell Workout", "Pilates Mat",
  "Boxing Training", "Mountain Bike Ride", "Rowing Machine", "Stair Climber",
  "Dance Cardio", "TRX Session", "Barre Class", "Meditation & Stretch",
  "Functional Training", "Olympic Lifting", "Endurance Ride",
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
  "https://images.unsplash.com/photo-1552196563-55cd4e45efb3?w=400",
];

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seedDatabase() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",   // ✅ FIXED (was DB_PASS)
    database: process.env.DB_NAME || "solo3_workouts",
    connectionLimit: 1,
  });

  try {
    console.log("Starting database seed...");

    // Clear existing data
    await pool.query("DELETE FROM workouts");
    await pool.query("ALTER TABLE workouts AUTO_INCREMENT = 1");
    console.log("Cleared existing workouts");

    // Generate 40 workouts (more than 30 to be safe)
    const workouts = [];
    const startDate = new Date("2024-01-01");
    const endDate = new Date("2025-12-31");

    for (let i = 0; i < 40; i++) {
      const title = workoutTitles[i % workoutTitles.length];
      const category = workoutCategories[Math.floor(Math.random() * workoutCategories.length)];
      const workoutDate = randomDate(startDate, endDate).toISOString().split("T")[0];
      const durationMin = randomInt(15, 120);
      const notes = `Great ${category.toLowerCase()} workout! ${
        i % 3 === 0 ? "Felt amazing!" : i % 3 === 1 ? "Pushed hard today." : "Nice recovery session."
      }`;
      const imageUrl = imageUrls[Math.floor(Math.random() * imageUrls.length)];

      workouts.push([title, workoutDate, category, durationMin, notes, imageUrl]);
    }

    // Insert all workouts
    const query = `
      INSERT INTO workouts (title, workout_date, category, duration_min, notes, image_url)
      VALUES ?
    `;

    const [result] = await pool.query(query, [workouts]);
    console.log(`✅ Successfully seeded ${result.affectedRows} workouts!`);

    const [sample] = await pool.query("SELECT id, title, category, duration_min, workout_date FROM workouts LIMIT 5");
    console.log("\nSample workouts:");
    console.table(sample);
  } catch (err) {
    console.error("Error seeding database:", err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seedDatabase();
