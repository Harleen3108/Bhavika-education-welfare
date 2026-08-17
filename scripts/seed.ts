/* eslint-disable no-console */
/**
 * Idempotent seed script. Run with: `npm run seed`
 * Loads .env.local, connects to Mongo directly (no server-only modules), and
 * upserts: SystemSettings, an admin user (+wallet), CMS content, sample
 * gallery/videos/testimonials/partners, activity rewards, and a sample quiz.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { customAlphabet } from "nanoid";

import { User } from "../src/server/models/User";
import { Wallet } from "../src/server/models/Wallet";
import { SystemSettings } from "../src/server/models/SystemSettings";
import { Content } from "../src/server/models/Content";
import { Testimonial } from "../src/server/models/Testimonial";
import { Partner } from "../src/server/models/Partner";
import { Video } from "../src/server/models/Video";
import { GalleryItem } from "../src/server/models/GalleryItem";
import { ActivityReward } from "../src/server/models/ActivityReward";
import { Quiz } from "../src/server/models/Quiz";
import { UserRole, AccountStatus, QuizType, QuizStatus } from "../src/lib/enums";
import { CONTENT_KEYS, DEFAULT_ABOUT, DEFAULT_MISSION_VISION, DEFAULT_CONTACT } from "../src/lib/defaults";

const genCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8);

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI missing in .env.local");
  await mongoose.connect(uri, { dbName: process.env.MONGODB_DB_NAME || "bhavika" });
  console.log("✓ Connected to MongoDB");

  // ---- System settings (singleton) ----
  await SystemSettings.updateOne(
    { singleton: "global" },
    { $setOnInsert: { singleton: "global" } },
    { upsert: true },
  );
  console.log("✓ System settings ensured");

  // ---- Admin user ----
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || "admin@bhavikafoundation.org").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "ChangeMe!Strong123";
  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    admin = await User.create({
      name: "Foundation Admin",
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 12),
      role: UserRole.ADMIN,
      status: AccountStatus.ACTIVE,
      emailVerified: new Date(),
      referralCode: genCode(),
      profileCompleted: true,
    });
    await Wallet.updateOne({ user: admin._id }, { $setOnInsert: { user: admin._id } }, { upsert: true });
    console.log(`✓ Admin created: ${adminEmail}  (password: ${adminPassword})`);
  } else {
    console.log(`• Admin already exists: ${adminEmail}`);
  }

  // ---- CMS content ----
  await Content.updateOne(
    { key: CONTENT_KEYS.about },
    { $setOnInsert: { key: CONTENT_KEYS.about, data: DEFAULT_ABOUT } },
    { upsert: true },
  );
  await Content.updateOne(
    { key: CONTENT_KEYS.missionVision },
    { $setOnInsert: { key: CONTENT_KEYS.missionVision, data: DEFAULT_MISSION_VISION } },
    { upsert: true },
  );
  await Content.updateOne(
    { key: CONTENT_KEYS.contactInfo },
    { $setOnInsert: { key: CONTENT_KEYS.contactInfo, data: DEFAULT_CONTACT } },
    { upsert: true },
  );
  console.log("✓ CMS content seeded");

  // ---- Testimonials ----
  const testimonials = [
    { name: "Anita Sharma", role: "Parent, Learning Centre", message: "The foundation gave my daughter a chance to learn that we could never have afforded. She now dreams of becoming a teacher.", order: 1 },
    { name: "Ravi Kumar", role: "Volunteer", message: "Volunteering here changed how I see my community. Every session reminds me that small efforts add up to real change.", order: 2 },
    { name: "Priya Nair", role: "Scholarship Student", message: "Thanks to the scholarship and mentorship, I completed my studies and got my first job. I'm forever grateful.", order: 3 },
  ];
  for (const t of testimonials) {
    await Testimonial.updateOne({ name: t.name }, { $setOnInsert: { ...t, active: true } }, { upsert: true });
  }
  console.log("✓ Testimonials seeded");

  // ---- Partners ----
  const partners = [
    { name: "Community Trust", description: "Local welfare partner", order: 1 },
    { name: "EduReach", description: "Education programs collaborator", order: 2 },
    { name: "HealthFirst", description: "Health camp partner", order: 3 },
  ];
  for (const p of partners) {
    await Partner.updateOne({ name: p.name }, { $setOnInsert: { ...p, active: true } }, { upsert: true });
  }
  console.log("✓ Partners seeded");

  // ---- Videos ----
  const videos = [
    { title: "Our Story", description: "A short introduction to our mission.", videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", order: 1 },
  ];
  for (const v of videos) {
    await Video.updateOne({ title: v.title }, { $setOnInsert: { ...v, active: true } }, { upsert: true });
  }
  console.log("✓ Videos seeded");

  // ---- Gallery (uses picsum placeholders; replace via admin/Cloudinary) ----
  const gallery = Array.from({ length: 8 }).map((_, i) => ({
    title: `Program moment ${i + 1}`,
    category: i % 2 === 0 ? "Education" : "Welfare",
    imageUrl: `https://picsum.photos/seed/bhavika${i + 1}/800/800`,
    width: 800,
    height: 800,
    order: i + 1,
  }));
  for (const g of gallery) {
    await GalleryItem.updateOne({ title: g.title }, { $setOnInsert: { ...g, active: true } }, { upsert: true });
  }
  console.log("✓ Gallery seeded");

  // ---- Activity rewards ----
  await ActivityReward.updateOne(
    { key: "profile_completion" },
    {
      $setOnInsert: {
        key: "profile_completion",
        name: "Complete your profile",
        description: "Earn points for completing your profile details.",
        points: 20,
        maxPerUser: 1,
        active: true,
      },
    },
    { upsert: true },
  );
  console.log("✓ Activity rewards seeded");

  // ---- Sample daily quiz ----
  const quizSlug = "welcome-daily-quiz";
  const existingQuiz = await Quiz.findOne({ slug: quizSlug });
  if (!existingQuiz) {
    const now = new Date();
    const end = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30); // active 30 days
    await Quiz.create({
      title: "Welcome Daily Quiz",
      slug: quizSlug,
      description: "A friendly quiz to get you started. Answer and earn your first points!",
      type: QuizType.DAILY,
      status: QuizStatus.ACTIVE,
      startAt: now,
      endAt: end,
      timeLimitSeconds: 180,
      maxAttempts: 1,
      createdBy: admin._id,
      questions: [
        {
          text: "What does an NGO primarily focus on?",
          options: ["Maximising profit", "Community welfare & social good", "Selling products", "Political power"],
          correctIndex: 1,
          points: 10,
          order: 1,
        },
        {
          text: "Bhavika Foundation's tagline is 'Empowerment Through ___ & Care'.",
          options: ["Wealth", "Knowledge", "Power", "Fame"],
          correctIndex: 1,
          points: 10,
          order: 2,
        },
        {
          text: "Which of these is a core value of the foundation?",
          options: ["Exclusion", "Compassion", "Secrecy", "Indifference"],
          correctIndex: 1,
          points: 10,
          order: 3,
        },
      ],
    });
    console.log("✓ Sample daily quiz created");
  } else {
    console.log("• Sample quiz already exists");
  }

  // Ensure indexes are built.
  await Promise.all([
    User.syncIndexes(),
    Wallet.syncIndexes(),
    Quiz.syncIndexes(),
  ]);

  console.log("\n✅ Seed complete.\n");
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error("❌ Seed failed:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
