/* eslint-disable no-console */
/**
 * Replaces the original placeholder CMS content with the curated set.
 *
 * `npm run seed` is deliberately idempotent — every write is `$setOnInsert`
 * keyed on the title/name — so it can never overwrite the first seed's
 * placeholder rows (picsum.photos gallery images, three logo-less partners).
 * This script is the one-time migration off them.
 *
 * SAFETY: it only removes rows matching a known placeholder signature —
 * gallery images hosted on picsum.photos, and the exact three testimonial /
 * partner names the first seed created. Anything an admin added through the
 * CMS is left untouched. Run with: npx tsx scripts/refresh-content.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import mongoose from "mongoose";
import { GalleryItem } from "../src/server/models/GalleryItem";
import { Testimonial } from "../src/server/models/Testimonial";
import { Partner } from "../src/server/models/Partner";
import { GALLERY_IMAGES, TESTIMONIAL_AVATARS } from "../src/lib/images";

/** Names created by the original seed. Only these are eligible for removal. */
const PLACEHOLDER_TESTIMONIALS = ["Anita Sharma", "Ravi Kumar", "Priya Nair"];
const PLACEHOLDER_PARTNERS = ["Community Trust", "EduReach", "HealthFirst"];

/**
 * Testimonials deliberately mix languages the way the audience actually
 * speaks: English, Hinglish (the common register for urban parents and
 * students), and one entirely in Hindi.
 *
 * PORTRAIT RULE: the avatar key must match the speaker's gender. Each entry
 * carries the portrait's subject in a comment because the keys are roles
 * ("graduate", "elder") which say nothing about who is pictured — that is
 * exactly how Rahul Verma ended up illustrated by a photograph of a young
 * woman. Check src/lib/images.ts TESTIMONIAL_AVATARS `alt` text before
 * assigning a new one.
 */
const TESTIMONIALS = [
  {
    name: "Sunita Devi",
    role: "Parent, Class 8 student · Rohtak",
    message:
      "My daughter now finishes her homework early just so she can play the quiz. Last month her points became a grocery discount. I never imagined studying could help my household budget.",
    imageUrl: TESTIMONIAL_AVATARS.parent.url, // older woman in a sari — female speaker
    order: 1,
  },
  {
    name: "Arun Prakash",
    role: "Principal, partner school · Sonipat",
    message:
      "As a school principal I have seen many NGOs come for one photograph and leave. Bhavika's team has come back every single month for two years. That consistency is what changes a child's result.",
    imageUrl: TESTIMONIAL_AVATARS.father.url, // middle-aged man — male speaker
    order: 2,
  },
  {
    name: "Rahul Verma",
    role: "Student, Class 9 · छात्र",
    message:
      "Pehle main class mein hamesha average tha, kisi ne notice nahi kiya. Leaderboard pe jab district mein third aaya, tab ghar mein sab ne dekha. Woh certificate aaj bhi deewar pe laga hai.",
    imageUrl: TESTIMONIAL_AVATARS.student.url, // smiling boy — male speaker (was `graduate`, a young woman)
    order: 3,
  },
  {
    name: "Meena Kumari",
    role: "Skill programme graduate · प्रशिक्षणार्थी",
    message:
      "Tailoring course ne sab kuch badal diya. Ab main chaar dukaano ke liye silai karti hoon aur bete ki fees khud bharti hoon. Foundation ne badle mein kuch nahi maanga.",
    imageUrl: TESTIMONIAL_AVATARS.trainee.url, // woman in a red sari — female speaker
    order: 4,
  },
  {
    name: "Anjali Sharma",
    role: "Student, Class 8 · छात्रा",
    message:
      "Maths se mujhe hamesha darr lagta tha. Daily quiz mein roz do-teen sawaal aate hain, aur ab main bina soche jawab de deti hoon. Pichhle mahine main apni class mein second aayi.",
    imageUrl: TESTIMONIAL_AVATARS.schoolgirl.url, // girl with a book — female speaker
    order: 6,
  },
  {
    name: "रामप्रसाद यादव",
    role: "अभिभावक · गाँव सांघी",
    message:
      "मेरे गाँव में पढ़ाई को कोई गंभीरता से नहीं लेता था। अब बच्चे रोज़ शाम को क्विज़ खेलने बैठते हैं और पूछते हैं कि कल का सवाल क्या होगा। पॉइंट्स से जो छूट मिलती है, उससे घर का खर्च भी हल्का हुआ है।",
    imageUrl: TESTIMONIAL_AVATARS.elder.url, // elderly farmer — male speaker
    order: 5,
  },
] as const;

/**
 * Partners carry a short description and a category so the section reads as a
 * real network rather than a row of bare names. No logo URLs: inventing brand
 * marks for real-sounding organisations would be misrepresentation, so the UI
 * renders a monogram instead.
 */
const PARTNERS = [
  {
    name: "Jai Maa Durga Stores",
    description: "Retail partner — honours Bhavika reward coupons as real discounts at checkout.",
    order: 1,
  },
  {
    name: "District Education Office, Rohtak",
    description: "Government partner — school access, enrolment drives and exam guidance.",
    order: 2,
  },
  {
    name: "Gramin Swasthya Kendra",
    description: "Health partner — runs the free check-up and screening camps with our volunteers.",
    order: 3,
  },
  {
    name: "Sunrise Public School",
    description: "Partner school — hosts after-school coaching and the weekly quiz finals.",
    order: 4,
  },
  {
    name: "Van Prahari Nursery",
    description: "Environment partner — supplies saplings for school eco-club plantation drives.",
    order: 5,
  },
  {
    name: "Sakhi Mahila Samiti",
    description: "Women's self-help group — co-runs tailoring and micro-enterprise training.",
    order: 6,
  },
  {
    name: "Gram Panchayat, Sanghi",
    description: "Local body — provides community-hall space for evening learning centres.",
    order: 7,
  },
  {
    name: "Rotary Club of Rohtak",
    description: "Service partner — funds scholarships and the annual notebook distribution.",
    order: 8,
  },
] as const;

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!, {
    dbName: process.env.MONGODB_DB_NAME || "bhavika",
  });
  console.log("✓ Connected");

  // ---- Gallery: drop placeholder hosts, insert the curated manifest ----
  const removedGallery = await GalleryItem.deleteMany({
    imageUrl: { $regex: "picsum\\.photos", $options: "i" },
  });
  console.log(`✓ Removed ${removedGallery.deletedCount} picsum placeholder images`);

  for (const [i, img] of GALLERY_IMAGES.entries()) {
    await GalleryItem.updateOne(
      { title: img.title },
      {
        $set: {
          title: img.title,
          category: img.category,
          imageUrl: img.url,
          width: 1200,
          height: 900,
          order: i + 1,
          active: true,
        },
      },
      { upsert: true },
    );
  }
  console.log(`✓ Gallery now holds ${GALLERY_IMAGES.length} curated photos`);

  // ---- Testimonials ----
  const removedT = await Testimonial.deleteMany({ name: { $in: PLACEHOLDER_TESTIMONIALS } });
  console.log(`✓ Removed ${removedT.deletedCount} placeholder testimonials`);

  for (const t of TESTIMONIALS) {
    await Testimonial.updateOne(
      { name: t.name },
      { $set: { ...t, active: true } },
      { upsert: true },
    );
  }
  console.log(`✓ Seeded ${TESTIMONIALS.length} testimonials (English / Hinglish / Hindi)`);

  // ---- Partners ----
  const removedP = await Partner.deleteMany({ name: { $in: PLACEHOLDER_PARTNERS } });
  console.log(`✓ Removed ${removedP.deletedCount} placeholder partners`);

  for (const p of PARTNERS) {
    await Partner.updateOne({ name: p.name }, { $set: { ...p, active: true } }, { upsert: true });
  }
  console.log(`✓ Seeded ${PARTNERS.length} partners`);

  console.log("\n✅ Content refresh complete.\n");
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("❌ Refresh failed:", err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
