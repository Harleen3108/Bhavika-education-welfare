import { z } from "zod";
import { QuizType, QuizStatus, AccountStatus, ContactStatus } from "@/lib/enums";

const url = z.string().url("Enter a valid URL.");
const optionalUrl = url.optional().or(z.literal(""));

// ---- Simple content collections ----
export const gallerySchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(600).optional().or(z.literal("")),
  category: z.string().trim().max(80).optional().or(z.literal("")),
  imageUrl: url,
  publicId: z.string().optional().or(z.literal("")),
  order: z.coerce.number().int().min(0).default(0),
  active: z.boolean().default(true),
});

export const videoSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(600).optional().or(z.literal("")),
  category: z.string().trim().max(80).optional().or(z.literal("")),
  videoUrl: url,
  thumbnailUrl: optionalUrl,
  order: z.coerce.number().int().min(0).default(0),
  active: z.boolean().default(true),
});

export const testimonialSchema = z.object({
  name: z.string().trim().min(2).max(120),
  role: z.string().trim().max(120).optional().or(z.literal("")),
  message: z.string().trim().min(5).max(800),
  imageUrl: optionalUrl,
  order: z.coerce.number().int().min(0).default(0),
  active: z.boolean().default(true),
});

export const partnerSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  logoUrl: optionalUrl,
  websiteUrl: optionalUrl,
  order: z.coerce.number().int().min(0).default(0),
  active: z.boolean().default(true),
});

// ---- CMS text content ----
export const aboutContentSchema = z.object({
  heading: z.string().trim().min(2).max(200),
  intro: z.string().trim().min(2).max(1000),
  story: z.array(z.string().trim().min(1)).max(10),
  objectives: z.array(z.string().trim().min(1)).max(15),
  areas: z
    .array(z.object({ title: z.string().trim().min(1).max(120), body: z.string().trim().min(1).max(400) }))
    .max(12),
});

export const missionVisionSchema = z.object({
  mission: z.string().trim().min(2).max(1000),
  vision: z.string().trim().min(2).max(1000),
  values: z
    .array(z.object({ title: z.string().trim().min(1).max(80), body: z.string().trim().min(1).max(300) }))
    .max(12),
});

export const contactInfoSchema = z.object({
  email: z.string().trim().email(),
  phone: z.string().trim().max(30),
  whatsapp: z.string().trim().max(20),
  address: z.string().trim().max(300),
  mapEmbedUrl: z.string().trim().max(1000).optional().or(z.literal("")),
  hours: z.string().trim().max(120),
});

// ---- Quiz management ----
export const quizMetaSchema = z
  .object({
    title: z.string().trim().min(2).max(160),
    description: z.string().trim().max(1000).optional().or(z.literal("")),
    type: z.enum([QuizType.DAILY, QuizType.WEEKLY]),
    status: z.enum([QuizStatus.DRAFT, QuizStatus.ACTIVE, QuizStatus.ARCHIVED]),
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
    timeLimitSeconds: z.coerce.number().int().min(30).max(7200),
    maxAttempts: z.coerce.number().int().min(1).max(10),
  })
  .refine((d) => d.endAt > d.startAt, { message: "End time must be after start time.", path: ["endAt"] });

export const questionSchema = z
  .object({
    text: z.string().trim().min(2).max(500),
    imageUrl: optionalUrl,
    options: z.array(z.string().trim().min(1).max(200)).min(2).max(6),
    correctIndex: z.coerce.number().int().min(0),
    points: z.coerce.number().int().min(0).max(1000).default(10),
    order: z.coerce.number().int().min(0).default(0),
  })
  .refine((d) => d.correctIndex < d.options.length, {
    message: "Correct answer index is out of range.",
    path: ["correctIndex"],
  });

// ---- Users / wallet / referrals / contacts / settings ----
export const userStatusSchema = z.object({
  userId: z.string().regex(/^[a-f\d]{24}$/i),
  status: z.enum([
    AccountStatus.ACTIVE,
    AccountStatus.PENDING,
    AccountStatus.SUSPENDED,
    AccountStatus.BLOCKED,
  ]),
  reason: z.string().trim().max(300).optional().or(z.literal("")),
});

export const adjustmentSchema = z.object({
  userId: z.string().regex(/^[a-f\d]{24}$/i),
  points: z.coerce.number().int().refine((n) => n !== 0, "Points cannot be zero.").refine((n) => Math.abs(n) <= 100000, "Too large."),
  reason: z.string().trim().min(3, "A reason is required.").max(300),
});

export const contactStatusSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i),
  status: z.enum([ContactStatus.NEW, ContactStatus.READ, ContactStatus.RESPONDED, ContactStatus.SPAM]),
});

export const settingsSchema = z.object({
  referral: z.object({
    referrerReward: z.coerce.number().int().min(0).max(100000),
    referredReward: z.coerce.number().int().min(0).max(100000),
    requireEmailVerification: z.boolean(),
    requireFirstQuiz: z.boolean(),
  }),
  quiz: z.object({
    defaultTimeLimitSeconds: z.coerce.number().int().min(30).max(7200),
    defaultMaxAttempts: z.coerce.number().int().min(1).max(10),
    defaultPointsPerCorrect: z.coerce.number().int().min(0).max(1000),
  }),
  activity: z.object({
    profileCompletionPoints: z.coerce.number().int().min(0).max(100000),
  }),
  integration: z.object({
    redemptionEnabled: z.boolean(),
  }),
});
