import { z } from "zod";

/*
  Client-safe: no server-only imports. The member's KYC form, the admin
  "issue a card" form and the API routes all parse through here, so a value is
  normalised (spaces stripped, PAN upper-cased) before anything touches the
  database or the encryptor.
*/

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id.");

/** 12 digits, however the member spaced them. */
export const aadhaarField = z
  .string()
  .trim()
  .transform((s) => s.replace(/[\s-]/g, ""))
  .pipe(z.string().regex(/^\d{12}$/, "Aadhaar must be exactly 12 digits."));

/** Standard PAN shape, e.g. ABCDE1234F. */
export const panField = z
  .string()
  .trim()
  .toUpperCase()
  .pipe(z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Enter a valid PAN (e.g. ABCDE1234F)."));

/** The KYC a member fills in to request a card. Photo is their profile avatar. */
export const idCardSubmitSchema = z.object({
  fatherName: z.string().trim().min(2, "Father's name is required.").max(120),
  address: z.string().trim().min(5, "Enter your full address.").max(300),
  aadhaar: aadhaarField,
  pan: panField,
});
export type IdCardSubmitInput = z.infer<typeof idCardSubmitSchema>;

/**
 * Admin issuing a card on a member's behalf. Same KYC plus the target member;
 * an optional photo URL lets the admin attach one when the member has no avatar
 * (otherwise the member's existing avatar is used).
 */
export const adminIssueIdCardSchema = idCardSubmitSchema.extend({
  userId: objectId,
  photoUrl: z.string().url("Enter a valid image URL.").optional().or(z.literal("")),
});
export type AdminIssueIdCardInput = z.infer<typeof adminIssueIdCardSchema>;

/** Approve or reject a pending card. A rejection should carry a reason. */
export const idCardActionSchema = z.object({
  cardId: objectId,
  action: z.enum(["approve", "reject"]),
  reason: z.string().trim().max(300).optional().or(z.literal("")),
});
export type IdCardActionInput = z.infer<typeof idCardActionSchema>;

/** `123412341234` → `XXXX XXXX 1234`. Client-safe display helper. */
export function maskAadhaar(last4: string): string {
  return `XXXX XXXX ${last4}`;
}

/** `ABCDE1234F` → `XXXXXX234F` style tail. */
export function maskPan(last4: string): string {
  return `XXXXXX${last4}`;
}
