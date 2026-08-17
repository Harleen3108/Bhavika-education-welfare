import "server-only";
import type { Types } from "mongoose";
import { withTransaction, dbConnect } from "@/server/db/connect";
import { User, Wallet } from "@/server/models";
import { AccountStatus } from "@/lib/enums";
import { env } from "@/lib/env";
import { SITE } from "@/lib/constants";
import { DomainError } from "@/server/errors";
import { hashPassword } from "@/server/auth/password";
import { issueToken, consumeToken, peekToken } from "./token.service";
import { issueOtp, activateVerifiedUser } from "./otp.service";
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

export type RegisterResult = { userId: string; email: string; resent: boolean };

/**
 * Issue a fresh link + code pair and email them together. The user can click or
 * type — whichever suits them — and a delivery failure is logged, never thrown,
 * so it can't take down the registration it belongs to.
 */
async function sendVerificationBundle(
  userId: Types.ObjectId | string,
  email: string,
  name: string,
): Promise<void> {
  const token = await issueToken(userId, "EMAIL_VERIFY");
  const code = await issueOtp(userId);
  const url = `${baseUrl}/verify-email?token=${token}`;
  await sendVerificationEmail(email, name, url, code).catch((e) =>
    console.error("[auth] verification email failed:", e),
  );
}

/**
 * Register a new user. Creates the User (PENDING), their Wallet, and — if a
 * valid referral code was used — a PENDING Referral, all in one transaction.
 * Then issues + emails a verification link and a 6-digit code.
 *
 * Re-registering an address that is still PENDING is treated as "send it
 * again", not as a conflict: the previous attempt was never verified, so
 * rejecting it would strand the user with an account they can never activate.
 * The resend is all it does, though — the existing account is never rewritten
 * from an unauthenticated request. Accepting the submitted password here would
 * let anyone who knows a pending address overwrite its credentials and hold the
 * account the moment its real owner clicks verify. Someone who genuinely typed
 * the wrong password on the first attempt recovers through password reset.
 */
export async function registerUser(input: RegisterInput): Promise<RegisterResult> {
  await dbConnect();

  const email = input.email.toLowerCase();
  const rawCode = input.referralCode ? input.referralCode.toUpperCase() : "";

  const existing = await User.findOne({ email }).select("_id name status");
  if (existing) {
    if (existing.status !== AccountStatus.PENDING) {
      throw new DomainError("An account with this email already exists.", 409, "EMAIL_TAKEN");
    }

    // Name from the stored account, not from the request: the email goes to the
    // mailbox owner, so an attacker must not get to choose what it greets them
    // with. Referral attribution is likewise left alone — re-registering
    // someone else's pending address must not credit the sender.
    await sendVerificationBundle(existing._id, email, existing.name);
    return { userId: existing._id.toString(), email, resent: true };
  }

  // Validate the referral code on the backend (never trust the client).
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
  await sendVerificationBundle(userId, email, input.name);

  return { userId, email, resent: false };
}

/**
 * Verify an email token → activate the account.
 *
 * Idempotent for the same link: the token is single-use, so a refresh or a
 * second click finds it already consumed. Rather than reporting that as a
 * failure, we confirm success when the account behind it is in fact verified.
 */
export async function verifyEmail(token: string): Promise<void> {
  await dbConnect();

  const userId = await consumeToken(token, "EMAIL_VERIFY");
  if (userId) {
    await activateVerifiedUser(userId);
    return;
  }

  const priorUserId = await peekToken(token, "EMAIL_VERIFY");
  if (priorUserId) {
    const user = await User.findById(priorUserId).select("emailVerified").lean();
    if (user?.emailVerified) return;
  }

  throw new DomainError("This verification link is invalid or has expired.", 400, "BAD_TOKEN");
}

/** Resend a verification link + code. Never reveals whether the email exists. */
export async function resendVerification(email: string): Promise<void> {
  await dbConnect();
  const user = await User.findOne({ email: email.toLowerCase() }).select("_id name status");
  if (user && user.status === AccountStatus.PENDING) {
    await sendVerificationBundle(user._id, email.toLowerCase(), user.name);
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
