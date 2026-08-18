import { z } from "zod";
import { COUPON_CODE } from "@/lib/constants";

/*
  Client-safe: no server-only imports. The member's "generate a coupon" form,
  the admin console and the partner store's API route all parse through here so
  a code typed on a phone and a code pasted from an email normalise to the same
  string before anything touches the database.
*/

/** Random characters in a code, excluding the `BHAV` prefix and the dashes. */
export const COUPON_CODE_BODY_LENGTH = COUPON_CODE.groups * COUPON_CODE.groupLength;

/** Length of a normalised code with its dashes stripped. */
const COMPACT_LENGTH = COUPON_CODE.prefix.length + COUPON_CODE_BODY_LENGTH;

// The alphabet contains no regex metacharacters, so it drops straight into a
// character class.
const GROUP = `[${COUPON_CODE.alphabet}]{${COUPON_CODE.groupLength}}`;

/** Matches a fully normalised code, e.g. `BHAV-7K2X-9QM4-P8RT`. */
export const COUPON_CODE_PATTERN = new RegExp(
  `^${COUPON_CODE.prefix}(?:-${GROUP}){${COUPON_CODE.groups}}$`,
);

/** Insert the prefix and the group dashes around a bare body of characters. */
export function formatCouponCode(body: string): string {
  const groups: string[] = [];
  for (let i = 0; i < body.length; i += COUPON_CODE.groupLength) {
    groups.push(body.slice(i, i + COUPON_CODE.groupLength));
  }
  return [COUPON_CODE.prefix, ...groups].join("-");
}

/**
 * Canonicalise whatever the member typed: lower case, missing dashes, spaces
 * instead of dashes, or the bare body without the `BHAV` prefix.
 *
 * The prefix is only stripped when the compact string both starts with it AND
 * has the full length — `BHAV` is spellable from the code alphabet, so a body
 * that happens to begin `BHAV…` must not lose four of its characters.
 *
 * Garbage in still produces a string; `COUPON_CODE_PATTERN` is what rejects it.
 */
export function normalizeCouponCode(input: string): string {
  const compact = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const body =
    compact.startsWith(COUPON_CODE.prefix) && compact.length === COMPACT_LENGTH
      ? compact.slice(COUPON_CODE.prefix.length)
      : compact;
  return formatCouponCode(body);
}

export function isCouponCode(value: string): boolean {
  return COUPON_CODE_PATTERN.test(value);
}

/** A coupon code in any of its typed forms, normalised on the way through. */
export const couponCodeSchema = z
  .string()
  .trim()
  .min(1, "Enter your coupon code.")
  .max(64, "That is longer than any coupon code.")
  .transform(normalizeCouponCode)
  .refine(isCouponCode, "That doesn't look like a Bhavika coupon code.");

/**
 * How many points to convert.
 *
 * Only the shape is checked here. The minimum, the step and the member's actual
 * balance are all live settings re-read inside `issueCoupon`, so they cannot be
 * baked into a static schema — and the server, not this schema, is the
 * authority on every one of them.
 */
export const issueCouponSchema = z.object({
  points: z.coerce
    .number()
    .int("Use a whole number of points.")
    .positive("Choose how many points to convert.")
    .max(10_000_000, "That is more points than anyone could hold."),
});
export type IssueCouponInput = z.infer<typeof issueCouponSchema>;

/** Read-only check, used by the partner store before it accepts a coupon. */
export const validateCouponSchema = z.object({
  code: couponCodeSchema,
});
export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;

/**
 * Marking a coupon spent. `externalRef` is required: the store's own order id
 * is the only thread back from a redeemed coupon to the purchase it paid for,
 * and a dispute six weeks later has nothing else to go on.
 */
export const redeemCouponSchema = z.object({
  code: couponCodeSchema,
  externalRef: z
    .string()
    .trim()
    .min(1, "An order reference is required.")
    .max(120, "That order reference is too long."),
});
export type RedeemCouponInput = z.infer<typeof redeemCouponSchema>;
