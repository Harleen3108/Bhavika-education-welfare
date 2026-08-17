import "server-only";
import { z } from "zod";

/**
 * Server-only, validated environment variables.
 * Importing this file into a client component will fail the build (server-only),
 * which prevents accidental secret exposure.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  MONGODB_DB_NAME: z.string().default("bhavika"),

  // Auth.js
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be a long random string"),
  AUTH_URL: z.string().url().optional(),

  // Public site URL (also exposed as NEXT_PUBLIC_SITE_URL)
  SITE_URL: z.string().url().optional(),

  // Cloudinary (media)
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_UPLOAD_FOLDER: z.string().default("bhavika"),

  // Email (Resend)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("Bhavika Foundation <noreply@bhavikafoundation.org>"),

  // Rate limiting (Upstash) — optional; falls back to in-memory in dev
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Phase 2 integration (Jai Maa Durga) — not required in Phase 1
  JMD_INTEGRATION_URL: z.string().optional(),
  JMD_INTEGRATION_SECRET: z.string().optional(),
  JMD_REDEMPTION_ENABLED: z
    .string()
    .optional()
    .transform((v) => v === "true"),

  // Seeding
  SEED_ADMIN_EMAIL: z.string().optional(),
  SEED_ADMIN_PASSWORD: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(
    `Invalid or missing environment variables:\n${issues}\n\nCopy .env.example to .env.local and fill in the values.`,
  );
}

export const env = parsed.data;

export const isProd = env.NODE_ENV === "production";

export const cloudinaryConfigured = Boolean(
  env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET,
);

export const emailConfigured = Boolean(env.RESEND_API_KEY);
