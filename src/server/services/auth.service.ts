import "server-only";
import type { Types } from "mongoose";
import { withTransaction, dbConnect } from "@/server/db/connect";
import { User, Wallet } from "@/server/models";
import { AccountStatus } from "@/lib/enums";
import { env } from "@/lib/env";
import { SITE } from "@/lib/constants";
import { DomainError } from "@/server/errors";
import { hashPassword } from "@/server/auth/password";
import { issueToken, consumeToken } from "./token.service";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "./email.service";
import {
  generateUniqueReferralCode,
  resolveReferrer,
  recordReferral,
} from "./referral.service";
import type { RegisterInput } from "@/lib/validation/auth";

const baseUrl = env.SITE_URL || SITE.url;

/**
 * Register a new user. Creates the User (PENDING), their Wallet, and — if a
 * valid referral code was used — a PENDING Referral, all in one transaction.
 * Then issues + emails an email-verification link.
 */
export async function registerUser(input: RegisterInput): Promise<{ userId: string }> {
  await dbConnect();

  const email = input.email.toLowerCase();
  const existing = await User.findOne({ email }).select("_id");
  if (existing) {
    throw new DomainError("An account with this email already exists.", 409, "EMAIL_TAKEN");
  }

  // Validate referral code on the backend (never trust the client).
  const rawCode = input.referralCode ? input.referralCode.toUpperCase() : "";
  const referrerId = rawCode ? await resolveReferrer(rawCode) : null;

  const referralCode = await generateUniqueReferralCode();
  const passwordHash = await hashPassword(input.password);

  const userId = await withTransaction(async (session) => {
    const [user] = await User.create(
      [
        {
          name: input.name,
          email,
          passwordHash,
          status: AccountStatus.PENDING,
          referralCode,
          referrer: referrerId,
          referralCodeUsed: rawCode || null,
        },
      ],
      { session },
    );

    await Wallet.create([{ user: user._id }], { session });

    // Record the referral relationship (self-referral impossible at signup).
    if (referrerId) {
      await recordReferral(referrerId, user._id as Types.ObjectId, rawCode, session);
    }

    return (user._id as Types.ObjectId).toString();
  });

  // Fire verification email outside the transaction.
  const token = await issueToken(userId, "EMAIL_VERIFY");
  const url = `${baseUrl}/verify-email?token=${token}`;
  await sendVerificationEmail(email, input.name, url).catch((e) =>
    console.error("[auth] verification email failed:", e),
  );

  return { userId };
}

/** Verify an email token → activate the account. Idempotent-ish (single-use token). */
export async function verifyEmail(token: string): Promise<void> {
  await dbConnect();
  const userId = await consumeToken(token, "EMAIL_VERIFY");
  if (!userId) {
    throw new DomainError("This verification link is invalid or has expired.", 400, "BAD_TOKEN");
  }
  await User.updateOne(
    { _id: userId, status: AccountStatus.PENDING },
    { $set: { status: AccountStatus.ACTIVE, emailVerified: new Date() } },
  );
  // Ensure emailVerified is set even if status was already ACTIVE.
  await User.updateOne(
    { _id: userId, emailVerified: null },
    { $set: { emailVerified: new Date() } },
  );
  // If email verification is the only remaining gate, this may complete the
  // referral qualification. Idempotent + non-fatal.
  try {
    const { processReferralReward } = await import("./referral.service");
    await processReferralReward(userId.toString());
  } catch (e) {
    console.error("[auth] referral qualification hook failed:", e);
  }
}

/** Resend a verification email. Never reveals whether the email exists. */
export async function resendVerification(email: string): Promise<void> {
  await dbConnect();
  const user = await User.findOne({ email: email.toLowerCase() }).select(
    "_id name status",
  );
  if (user && user.status === AccountStatus.PENDING) {
    const token = await issueToken(user._id, "EMAIL_VERIFY");
    const url = `${baseUrl}/verify-email?token=${token}`;
    await sendVerificationEmail(email, user.name, url).catch(() => {});
  }
}

/** Begin password reset. Always resolves success (no user enumeration). */
export async function requestPasswordReset(email: string): Promise<void> {
  await dbConnect();
  const user = await User.findOne({ email: email.toLowerCase() }).select("_id name");
  if (user) {
    const token = await issueToken(user._id, "PASSWORD_RESET");
    const url = `${baseUrl}/reset-password?token=${token}`;
    await sendPasswordResetEmail(email, user.name, url).catch(() => {});
  }
}

/** Complete password reset with a valid one-time token. */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await dbConnect();
  const userId = await consumeToken(token, "PASSWORD_RESET");
  if (!userId) {
    throw new DomainError("This reset link is invalid or has expired.", 400, "BAD_TOKEN");
  }
  const passwordHash = await hashPassword(newPassword);
  await User.updateOne({ _id: userId }, { $set: { passwordHash } });
}
