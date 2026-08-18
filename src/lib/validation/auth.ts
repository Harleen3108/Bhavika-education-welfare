import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password is too long.")
  .regex(/[A-Za-z]/, "Include at least one letter.")
  .regex(/\d/, "Include at least one number.");

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Please enter your name.").max(80),
    email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(160),
    password: passwordSchema,
    confirmPassword: z.string(),
    referralCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{6,12}$/, "Invalid referral code.")
      .optional()
      .or(z.literal("")),
    acceptTerms: z.literal(true, {
      message: "You must accept the terms to continue.",
    }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});
export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Device position reported by the browser during an admin sign-in.
 *
 * Every field is optional and bounded. These coordinates come from the client
 * and are recorded as a claim, never trusted as a fact — the bounds only stop
 * nonsense reaching the database.
 */
export const gpsFixSchema = z.object({
  gpsLatitude: z.coerce.number().min(-90).max(90).nullable().optional(),
  gpsLongitude: z.coerce.number().min(-180).max(180).nullable().optional(),
  gpsAccuracy: z.coerce.number().min(0).max(100_000).nullable().optional(),
  gpsStatus: z
    .enum(["granted", "denied", "unavailable", "timeout", "unsupported"])
    .nullable()
    .optional(),
});
export type GpsFixInput = z.infer<typeof gpsFixSchema>;

/* ---- Multi-step admin login ---- */

/** Step 1 — identify the admin by email. */
export const adminLookupSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
});
export type AdminLookupInput = z.infer<typeof adminLookupSchema>;

/** Step 2 — verify the admin's password. */
export const adminPasswordSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Enter a valid email address."),
    password: z.string().min(1, "Enter your password."),
  })
  .extend(gpsFixSchema.shape);
export type AdminPasswordInput = z.infer<typeof adminPasswordSchema>;

/** Step 3 — the admin access code (validated server-side against ADMIN_ACCESS_CODE). */
export const adminCodeSchema = z.object({
  code: z.string().trim().min(1, "Enter the admin code."),
});
export type AdminCodeInput = z.infer<typeof adminCodeSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const resendVerificationSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
});
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;

export const verifyOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  // Codes get pasted with spaces or dashes far too often to reject over it.
  code: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your email.")),
});
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
