import { z } from "zod";
import { QuizType, QuizStatus, AccountStatus, ContactStatus, TransactionType } from "@/lib/enums";
import { passwordSchema } from "@/lib/validation/auth";

const url = z.string().url("Enter a valid URL.");
const optionalUrl = url.optional().or(z.literal(""));
const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id.");

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
  userId: objectId,
  status: z.enum([
    AccountStatus.ACTIVE,
    AccountStatus.PENDING,
    AccountStatus.SUSPENDED,
    AccountStatus.BLOCKED,
  ]),
  reason: z.string().trim().max(300).optional().or(z.literal("")),
});

export const adjustmentSchema = z.object({
  userId: objectId,
  points: z.coerce.number().int().refine((n) => n !== 0, "Points cannot be zero.").refine((n) => Math.abs(n) <= 100000, "Too large."),
  reason: z.string().trim().min(3, "A reason is required.").max(300),
});

/**
 * Manual wallet adjustment.
 *
 * `requestId` is minted by the browser once per attempt and is what makes the
 * whole flow exactly-once: the server turns it into the ledger's unique
 * `idempotencyKey`, so a double-click, a retry after a timeout, or a resubmitted
 * request all carry the same key and can only ever apply one transaction.
 * Direction is explicit rather than a signed number — "-50" typed into a field
 * the admin thought was a credit is the kind of mistake money code must not
 * allow.
 */
export const walletAdjustSchema = z.object({
  userId: objectId,
  direction: z.enum([TransactionType.CREDIT, TransactionType.DEBIT]),
  points: z.coerce
    .number()
    .int("Points must be a whole number.")
    .min(1, "Enter at least 1 point.")
    .max(100000, "That is larger than any single adjustment should be."),
  description: z
    .string()
    .trim()
    .min(3, "Describe this adjustment — the member reads it in their wallet.")
    .max(300, "Keep the description under 300 characters."),
  requestId: z.string().regex(/^[A-Za-z0-9_-]{16,64}$/, "Invalid request id."),
});
export type WalletAdjustInput = z.infer<typeof walletAdjustSchema>;

/**
 * Admin-created member. Deliberately cannot set a role: promoting someone to
 * ADMIN is a privilege escalation and must not ride along on a "create user"
 * form. The account is created ACTIVE and already email-verified — that is the
 * entire point of this endpoint — so no verification mail is ever sent.
 */
export const adminCreateUserSchema = z.object({
  name: z.string().trim().min(2, "Enter the member's name.").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(160),
  password: passwordSchema,
  referralCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{6,12}$/, "Referral codes are 6–12 letters and numbers.")
    .optional()
    .or(z.literal("")),
});
export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;

/**
 * Per-member redemption override. The reason is optional but lands in the audit
 * log, so an admin freezing an account leaves a trace of why.
 */
export const userRedemptionSchema = z.object({
  userId: objectId,
  blocked: z.boolean(),
  reason: z.string().trim().max(300).optional().or(z.literal("")),
});
export type UserRedemptionInput = z.infer<typeof userRedemptionSchema>;

/**
 * Admin-issued coupon.
 *
 * PROMO mints free value (source ADMIN, no points touched); POINTS spends the
 * member's own balance at the live rate. `valueRupees` is the face value in
 * whole rupees either way — capped so a slip of the keyboard cannot mint a
 * fortune, and a mandatory reason records why value was granted.
 */
export const adminIssueCouponSchema = z.object({
  userId: objectId,
  mode: z.enum(["PROMO", "POINTS"]),
  valueRupees: z.coerce
    .number()
    .int("Enter a whole rupee amount.")
    .min(1, "A coupon must be worth at least ₹1.")
    .max(100000, "That is larger than any single coupon should be."),
  reason: z.string().trim().min(3, "A reason is required.").max(300),
});
export type AdminIssueCouponInput = z.infer<typeof adminIssueCouponSchema>;

/** Void / reactivate / force-expire a single coupon. */
export const couponActionSchema = z.object({
  action: z.enum(["void", "reactivate", "expire"]),
  reason: z.string().trim().max(300).optional().or(z.literal("")),
});
export type CouponActionInput = z.infer<typeof couponActionSchema>;

export const contactStatusSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i),
  status: z.enum([ContactStatus.NEW, ContactStatus.READ, ContactStatus.RESPONDED, ContactStatus.SPAM]),
});

/**
 * Redemption economics.
 *
 * Every key of `integration` MUST be declared here. Zod strips unknown keys and
 * `updateSettings` writes `$set: { integration: <whole object> }`, so a field
 * missing from this schema is silently deleted from the stored document on the
 * next save — the settings would then fall back to defaults with no trace of
 * what the admin had configured.
 *
 * The three cross-field rules exist because the member-facing page states these
 * numbers as promises, and the server re-checks them in `initiateRedemption`:
 *
 *  1. step <= min          — a step larger than the threshold means the
 *                            advertised minimum is not itself redeemable.
 *  2. min % step === 0     — the threshold must land ON a step. Otherwise a
 *                            member who reaches exactly the advertised minimum
 *                            is told they are eligible while the smallest
 *                            amount the server accepts is one step higher.
 *  3. step % rate === 0    — a step must be worth a whole rupee. Coupon value
 *                            is floored, so a 250-point step at 3 points/₹
 *                            would quietly round ₹83.33 down to ₹83 and eat
 *                            the difference on every single redemption.
 *
 * Each cross-check short-circuits when the value it divides by is already
 * invalid, so a blank field reports one clear error instead of three.
 */
const integrationSettingsSchema = z
  .object({
    redemptionEnabled: z.boolean(),
    minRedeemPoints: z.coerce
      .number()
      .int("Use a whole number of points.")
      .min(1, "The minimum must be at least 1 point.")
      .max(1000000, "That threshold is higher than any member could reach."),
    pointsPerRupee: z.coerce
      .number()
      .int("Use a whole number of points.")
      .min(1, "At least 1 point must buy a rupee.")
      .max(10000, "That rate would make points practically worthless."),
    redeemStepPoints: z.coerce
      .number()
      .int("Use a whole number of points.")
      .min(1, "The step must be at least 1 point.")
      .max(1000000, "That step is larger than any realistic redemption."),
    /*
      How long an issued coupon stays usable.

      Not a cosmetic number: the points are debited the instant the coupon is
      created and are NOT returned when it lapses, so this is the entire window
      a family has to spend what they earned. Lowering it forfeits more points.
      Bounded at ten years because a coupon that never expires is a liability
      that never closes, and at one day because zero would mint coupons that are
      dead before the member reaches the shop.
    */
    couponValidityDays: z.coerce
      .number()
      .int("Use a whole number of days.")
      .min(1, "A coupon must be valid for at least one day.")
      .max(3650, "Ten years is longer than any coupon should stay redeemable."),
  })
  .refine((d) => d.minRedeemPoints < 1 || d.redeemStepPoints <= d.minRedeemPoints, {
    message: "The step cannot be larger than the minimum to redeem.",
    path: ["redeemStepPoints"],
  })
  .refine(
    (d) =>
      d.redeemStepPoints < 1 ||
      d.redeemStepPoints > d.minRedeemPoints ||
      d.minRedeemPoints % d.redeemStepPoints === 0,
    {
      message:
        "The minimum must be a whole number of steps, or members who reach it exactly still cannot redeem.",
      path: ["minRedeemPoints"],
    },
  )
  .refine((d) => d.pointsPerRupee < 1 || d.redeemStepPoints % d.pointsPerRupee === 0, {
    message: "Each step must be worth a whole number of rupees at this rate.",
    path: ["redeemStepPoints"],
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
  integration: integrationSettingsSchema,
});

/**
 * The exact shape `updateSettings` accepts. The admin form types its state with
 * this so a field it forgets to send is a compile error rather than a key that
 * disappears from the database on save.
 */
export type SettingsInput = z.infer<typeof settingsSchema>;
