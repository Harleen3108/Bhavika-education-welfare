import { z } from "zod";
import { DonationKind } from "@/lib/enums";
import { panField } from "./idcard";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id.");
const phoneField = z
  .string()
  .trim()
  .regex(/^[+\d][\d\s-]{6,19}$/, "Enter a valid phone number.")
  .optional()
  .or(z.literal(""));

/** What a donor (guest or member) submits to start a donation. */
export const donateSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email.").max(160),
  phone: phoneField,
  amount: z
    .coerce.number()
    .int("Enter a whole rupee amount.")
    .min(1, "Enter an amount of at least ₹1.")
    .max(10_000_000, "That is larger than a single online donation allows."),
  categoryId: objectId,
  pan: panField.optional().or(z.literal("")),
  anonymous: z.coerce.boolean().optional().default(false),
  message: z.string().trim().max(500).optional().or(z.literal("")),
});
export type DonateInput = z.infer<typeof donateSchema>;

/** Razorpay's callback payload, verified server-side before marking paid. */
export const verifyDonationSchema = z.object({
  donationId: objectId,
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});
export type VerifyDonationInput = z.infer<typeof verifyDonationSchema>;

/**
 * Admin records a donation offline, or issues a volunteer certificate. A
 * volunteer certificate carries no money, so `amount` may be 0 there.
 */
export const adminDonationSchema = z
  .object({
    kind: z.enum([DonationKind.DONATION, DonationKind.VOLUNTEER]),
    name: z.string().trim().min(2, "Enter a name.").max(120),
    email: z.string().trim().toLowerCase().email("Enter a valid email.").max(160),
    phone: phoneField,
    amount: z.coerce.number().int("Whole rupees only.").min(0).max(10_000_000).default(0),
    categoryId: objectId,
    pan: panField.optional().or(z.literal("")),
    anonymous: z.coerce.boolean().optional().default(false),
    message: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .refine((d) => d.kind === DonationKind.VOLUNTEER || d.amount >= 1, {
    message: "Enter the donation amount.",
    path: ["amount"],
  });
export type AdminDonationInput = z.infer<typeof adminDonationSchema>;

/** Admin-managed cause. */
export const donationCategorySchema = z.object({
  name: z.string().trim().min(2, "Enter a cause name.").max(120),
  nameHi: z.string().trim().max(120).optional().or(z.literal("")),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  active: z.coerce.boolean().optional().default(true),
  order: z.coerce.number().int().min(0).optional().default(0),
});
export type DonationCategoryInput = z.infer<typeof donationCategorySchema>;
