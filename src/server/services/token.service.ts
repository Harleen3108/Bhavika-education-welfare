import "server-only";
import { randomBytes, randomInt, createHash, createHmac, timingSafeEqual } from "crypto";
import type { Types } from "mongoose";
import { Token, type TokenPurpose } from "@/server/models";
import { env } from "@/lib/env";

const TTL: Record<TokenPurpose, number> = {
  EMAIL_VERIFY: 1000 * 60 * 60 * 24, // 24h
  EMAIL_OTP: 1000 * 60 * 10, // 10m
  PASSWORD_RESET: 1000 * 60 * 60, // 1h
};

export const OTP_TTL_MS = TTL.EMAIL_OTP;

/** Wrong codes accepted before the OTP is dead and a new one must be requested. */
export const MAX_OTP_ATTEMPTS = 5;

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Keyed hash for short numeric codes. A plain SHA-256 of a six-digit code is
 * reversible by brute force in milliseconds, so the OTP is peppered with
 * AUTH_SECRET — a database leak alone then reveals nothing.
 */
function hashCode(raw: string): string {
  return createHmac("sha256", env.AUTH_SECRET).update(raw).digest("hex");
}

/**
 * Comparison target for when there is no real OTP to check. Random at boot so
 * it can never match — its only job is to make an unknown email cost the same
 * work as a wrong code.
 */
export const DECOY_CODE_HASH = hashCode(randomBytes(16).toString("hex"));

/**
 * Create a one-time token. Only its hash is stored; the raw token is returned
 * once to embed in the emailed link. Any prior unused tokens of the same
 * purpose for this user are invalidated.
 */
export async function issueToken(
  userId: Types.ObjectId | string,
  purpose: TokenPurpose,
): Promise<string> {
  const raw = randomBytes(32).toString("hex");
  await Token.updateMany(
    { user: userId, purpose, usedAt: null },
    { $set: { usedAt: new Date() } },
  );
  await Token.create({
    user: userId,
    purpose,
    tokenHash: hashToken(raw),
    expiresAt: new Date(Date.now() + TTL[purpose]),
  });
  return raw;
}

/**
 * Consume a token atomically: valid only if it exists, matches purpose, is
 * unused and unexpired. Marks it used in the same operation (single-use).
 * Returns the userId if valid, else null.
 */
export async function consumeToken(
  raw: string,
  purpose: TokenPurpose,
): Promise<Types.ObjectId | null> {
  const tokenHash = hashToken(raw);
  const doc = await Token.findOneAndUpdate(
    { tokenHash, purpose, usedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { usedAt: new Date() } },
    { returnDocument: "before" },
  );
  return doc ? (doc.user as Types.ObjectId) : null;
}

/**
 * Look a token up without consuming it, ignoring used/expired state. Used to
 * tell "this link was already clicked" apart from "this link never existed",
 * so a refresh of the verify page isn't reported as a failure.
 */
export async function peekToken(
  raw: string,
  purpose: TokenPurpose,
): Promise<Types.ObjectId | null> {
  const doc = await Token.findOne({ tokenHash: hashToken(raw), purpose }).select("user").lean();
  return doc ? (doc.user as Types.ObjectId) : null;
}

/* ---- OTP codes ---- */

/** Token purposes whose secret is a short numeric code rather than a link. */
export type OtpPurpose = Extract<TokenPurpose, "EMAIL_OTP">;

export type OtpTokenView = {
  id: Types.ObjectId;
  tokenHash: string;
  attempts: number;
  expiresAt: Date;
};

/** Uniformly random 6-digit code, zero-padded (000000–999999 are all valid). */
function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/**
 * Issue a fresh OTP for this user, invalidating any earlier unused one. The
 * raw code is returned once, to be placed in the email body.
 */
export async function issueOtpToken(
  userId: Types.ObjectId | string,
  purpose: OtpPurpose = "EMAIL_OTP",
): Promise<string> {
  const code = generateOtpCode();
  await Token.updateMany(
    { user: userId, purpose, usedAt: null },
    { $set: { usedAt: new Date() } },
  );
  await Token.create({
    user: userId,
    purpose,
    tokenHash: hashCode(code),
    attempts: 0,
    expiresAt: new Date(Date.now() + TTL[purpose]),
  });
  return code;
}

/** The current (unused) OTP for a user, expired or not — expiry is reported, not hidden. */
export async function findLiveOtp(
  userId: Types.ObjectId | string,
  purpose: OtpPurpose = "EMAIL_OTP",
): Promise<OtpTokenView | null> {
  const doc = await Token.findOne({ user: userId, purpose, usedAt: null })
    .sort({ createdAt: -1 })
    .lean();
  if (!doc) return null;
  return {
    id: doc._id,
    tokenHash: doc.tokenHash,
    attempts: doc.attempts ?? 0,
    expiresAt: doc.expiresAt,
  };
}

/** Record a wrong code and return the new attempt count. */
export async function registerOtpFailure(tokenId: Types.ObjectId): Promise<number> {
  const doc = await Token.findOneAndUpdate(
    { _id: tokenId },
    { $inc: { attempts: 1 } },
    { returnDocument: "after" },
  )
    .select("attempts")
    .lean();
  // A vanished document can only mean the OTP is gone; treat it as exhausted.
  return doc?.attempts ?? MAX_OTP_ATTEMPTS;
}

/** Burn the OTP. Returns false if a concurrent request already consumed it. */
export async function consumeOtpToken(tokenId: Types.ObjectId): Promise<boolean> {
  const doc = await Token.findOneAndUpdate(
    { _id: tokenId, usedAt: null },
    { $set: { usedAt: new Date() } },
  );
  return Boolean(doc);
}

/** Constant-time check of a submitted code against a stored hash. */
export function codeMatches(raw: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashCode(raw), "utf8");
  const expected = Buffer.from(expectedHash, "utf8");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
