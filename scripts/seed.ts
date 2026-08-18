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
import { GALLERY_IMAGES, TESTIMONIAL_AVATARS } from "../src/lib/images";
import { pickBankQuestions, seedFrom, toQuizQuestions } from "../src/lib/question-bank";

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
  // Each quote carries its Hindi line inline: the card renders `message` as a
  // single paragraph, so a newline would collapse and the Hindi would vanish.
  const testimonials = [
    {
      name: "Sunita Devi",
      role: "Parent, Kanpur Dehat learning centre",
      message:
        "My daughter used to spend the whole day helping me in the field. Now she finishes her homework before I am back from work, and she teaches her younger brother too. बेटी को पढ़ते हुए देखना मेरे लिए सबसे बड़ी खुशी है।",
      imageUrl: TESTIMONIAL_AVATARS.parent.url,
      order: 1,
    },
    {
      name: "Rekha Yadav",
      role: "Tailoring batch 12, Women Empowerment programme",
      message:
        "I joined the tailoring course knowing nothing at all. Six months later I stitch for four families in my village and keep my own account book. अब मैं अपने पैरों पर खड़ी हूँ।",
      imageUrl: TESTIMONIAL_AVATARS.trainee.url,
      order: 2,
    },
    {
      name: "Anjali Verma",
      role: "Scholarship student, B.Sc. second year",
      message:
        "The foundation paid my fees and a mentor sat with me every Sunday before the entrance exam. I am the first girl in my family to reach college. मेरे सपने अब मेरे परिवार के सपने भी हैं।",
      imageUrl: TESTIMONIAL_AVATARS.graduate.url,
      order: 3,
    },
    {
      name: "Ramesh Prajapati",
      role: "Parent, Barabanki",
      message:
        "A health camp in our panchayat caught my son's eye problem early. His glasses arrived within a month and his marks improved that same term. समय पर जाँच ने बहुत कुछ बचा लिया।",
      imageUrl: TESTIMONIAL_AVATARS.father.url,
      order: 4,
    },
    {
      name: "Mohit Kushwaha",
      role: "Class 9 student, daily quiz player",
      message:
        "I play the daily quiz after school and my name has stayed in the top ten for three months. My reward coupon went straight into notebooks for my sister. पढ़ाई अब बोझ नहीं, खेल लगती है।",
      imageUrl: TESTIMONIAL_AVATARS.student.url,
      order: 5,
    },
    {
      name: "Devendra Pal",
      role: "Volunteer teacher, weekend classes",
      message:
        "I teach for two hours every Sunday and the children are always there before I am. Watching a child read her first full sentence is worth every weekend. यहाँ हर रविवार कुछ नया सिखा जाता है।",
      imageUrl: TESTIMONIAL_AVATARS.volunteer.url,
      order: 6,
    },
  ];
  for (const t of testimonials) {
    await Testimonial.updateOne({ name: t.name }, { $setOnInsert: { ...t, active: true } }, { upsert: true });
  }
  console.log("✓ Testimonials seeded");

  // ---- Partners ----
  // No logoUrl on purpose — PartnerCard falls back to the name in brand type,
  // which looks deliberate, where a missing logo file would look broken.
  const partners = [
    {
      name: "Jai Maa Durga Stores",
      description: "Retail partner for reward coupons. रिवॉर्ड कूपन भुनाने का साझेदार।",
      order: 1,
    },
    {
      name: "Sanskar Vidya Mandir",
      description: "Host school for after-school coaching batches. कोचिंग कक्षाओं का सहयोगी विद्यालय।",
      order: 2,
    },
    {
      name: "Gramin Swasthya Kendra",
      description: "Doctors and nurses for our free health camps. नि:शुल्क स्वास्थ्य शिविरों में सहयोग।",
      order: 3,
    },
    {
      name: "Nari Shakti Swayam Sahayata Samuh",
      description: "Women's self-help group behind the tailoring batches. सिलाई प्रशिक्षण में भागीदार।",
      order: 4,
    },
    {
      name: "Van Prahari Nursery",
      description: "Saplings for school plantation drives. वृक्षारोपण के लिए पौधे उपलब्ध कराते हैं।",
      order: 5,
    },
  ];
  for (const p of partners) {
    await Partner.updateOne({ name: p.name }, { $setOnInsert: { ...p, active: true } }, { upsert: true });
  }
  console.log("✓ Partners seeded");

  // ---- Videos ----
  // Awareness films we share, credited to their publishers in the description.
  // The foundation's own footage replaces these from Admin → Videos; every id
  // here was checked against the YouTube oEmbed endpoint so the card thumbnail
  // (built from the video id) actually resolves.
  const videos = [
    {
      title: "Shakira promotes girls' education",
      description: "UNICEF Goodwill Ambassador Shakira on why every girl belongs in a classroom. Published by UNICEF.",
      category: "Awareness",
      videoUrl: "https://www.youtube.com/watch?v=ZAi2O0MCScg",
      order: 1,
    },
    {
      title: "Educating girls",
      description: "A report on what changes in a family when a daughter stays in school. Published by BBC News.",
      category: "Awareness",
      videoUrl: "https://www.youtube.com/watch?v=F8sCADS5wKg",
      order: 2,
    },
    {
      title: "Girls' education in India: progress and challenges",
      description: "Where India stands on universal school education, with the numbers behind it. Published by Prof Arun C. Mehta.",
      category: "Education",
      videoUrl: "https://www.youtube.com/watch?v=Vt7Ok5uPLfc",
      order: 3,
    },
  ];
  for (const v of videos) {
    await Video.updateOne({ title: v.title }, { $setOnInsert: { ...v, active: true } }, { upsert: true });
  }
  console.log("✓ Videos seeded");

  // ---- Gallery ----
  // Curated, individually verified photographs — see src/lib/images.ts. The
  // lightbox caption gets the Hindi title plus the alt text, so the description
  // carries real meaning instead of repeating the heading.
  const gallery = GALLERY_IMAGES.map((img, i) => ({
    title: img.title,
    description: `${img.titleHi} — ${img.alt}`,
    category: img.category,
    imageUrl: img.url,
    order: i + 1,
  }));
  for (const g of gallery) {
    await GalleryItem.updateOne({ title: g.title }, { $setOnInsert: { ...g, active: true } }, { upsert: true });
  }
  console.log(`✓ Gallery seeded (${gallery.length} photos)`);

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

  // ---- Sample weekly quiz ----
  /*
    Drawn from the built-in question bank rather than written out here: the bank
    is bilingual and spans eight subjects, which is what a weekly paper for the
    children should look like. The draw is seeded off the slug so a rebuilt
    database gets the same twelve questions — a re-run cannot reshuffle a quiz
    members may already have attempted. Created only when missing, like every
    other write in this script.
  */
  const weeklySlug = "weekly-challenge-quiz";
  const existingWeekly = await Quiz.findOne({ slug: weeklySlug });
  if (!existingWeekly) {
    const now = new Date();
    const end = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 90); // one term
    const questions = toQuizQuestions(
      pickBankQuestions(12, { seed: seedFrom(weeklySlug) }),
      10,
    );
    await Quiz.create({
      title: "Weekly Challenge Quiz",
      slug: weeklySlug,
      description:
        "Twelve questions across science, maths, history, geography and more — a new challenge every week. हर सप्ताह एक नई चुनौती।",
      type: QuizType.WEEKLY,
      status: QuizStatus.ACTIVE,
      startAt: now,
      endAt: end,
      // Roughly a minute a question, which is unhurried for a class 5–9 reader
      // working through an English line and its Hindi line.
      timeLimitSeconds: 720,
      maxAttempts: 1,
      createdBy: admin._id,
      questions,
    });
    console.log(`✓ Sample weekly quiz created (${questions.length} questions from the bank)`);
  } else {
    console.log("• Sample weekly quiz already exists");
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
