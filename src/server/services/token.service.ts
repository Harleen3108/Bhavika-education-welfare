import "server-only";
import { randomBytes, createHash } from "crypto";
import type { Types } from "mongoose";
import { Token, type TokenPurpose } from "@/server/models";

const TTL: Record<TokenPurpose, number> = {
  EMAIL_VERIFY: 1000 * 60 * 60 * 24, // 24h
  PASSWORD_RESET: 1000 * 60 * 60, // 1h
};

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

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
    { new: false },
  );
  return doc ? (doc.user as Types.ObjectId) : null;
}
