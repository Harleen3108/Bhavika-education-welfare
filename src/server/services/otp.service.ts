import "server-only";
import type { Types } from "mongoose";
import { dbConnect } from "@/server/db/connect";
import { User } from "@/server/models";
import { AccountStatus } from "@/lib/enums";
import { DomainError } from "@/server/errors";
import {
  DECOY_CODE_HASH,
  MAX_OTP_ATTEMPTS,
  type OtpPurpose,
  codeMatches,
  consumeOtpToken,
  findLiveOtp,
  issueOtpToken,
  registerOtpFailure,
} from "./token.service";

export type { OtpPurpose };

export type OtpVerifyResult = { userId: string; alreadyVerified: boolean };

/**
 * One message for every rejection reason. The machine-readable `code` tells the
 * UI what to say next, but the prose never distinguishes "no such account" from
 * "wrong code", so the endpoint cannot be used to enumerate registered emails.
 */
const GENERIC_FAILURE = "That code is incorrect or has expired. Please try again.";

function otpError(code: "BAD_OTP" | "OTP_EXPIRED" | "TOO_MANY_ATTEMPTS"): DomainError {
  const message =
    code === "OTP_EXPIRED"
      ? "That code has expired. Request a new one."
      : code === "TOO_MANY_ATTEMPTS"
        ? "Too many incorrect attempts. Request a new code."
        : GENERIC_FAILURE;
  return new DomainError(message, 400, code);
}

/** Issue a fresh 6-digit code, returned raw so the caller can put it in the email. */
export async function issueOtp(
  userId: Types.ObjectId | string,
  purpose: OtpPurpose = "EMAIL_OTP",
): Promise<string> {
  await dbConnect();
  return issueOtpToken(userId, purpose);
}

/**
 * Mark an account as email-verified and run the follow-on hooks.
 *
 * This lives here rather than in auth.service so that both verification paths —
 * the OTP and the magic link — can share it without a circular import.
 */
export async function activateVerifiedUser(userId: Types.ObjectId | string): Promise<void> {
  // Only PENDING is promoted: a SUSPENDED or BLOCKED account must not be
  // resurrected by clicking an old verification link.
  await User.updateOne(
    { _id: userId, status: AccountStatus.PENDING },
    { $set: { status: AccountStatus.ACTIVE, emailVerified: new Date() } },
  );
  await User.updateOne(
    { _id: userId, emailVerified: null },
    { $set: { emailVerified: new Date() } },
  );

  // Verification may be the last gate on a pending referral. Idempotent + non-fatal.
  try {
    const { processReferralReward } = await import("./referral.service");
    await processReferralReward(userId.toString());
  } catch (e) {
    console.error("[auth] referral qualification hook failed:", e);
  }
}

/**
 * Consume a 6-digit code and activate the account behind it.
 * Throws a DomainError carrying BAD_OTP / OTP_EXPIRED / TOO_MANY_ATTEMPTS.
 */
export async function verifyOtp(email: string, code: string): Promise<OtpVerifyResult> {
  await dbConnect();

  const user = await User.findOne({ email: email.toLowerCase() }).select(
    "_id status emailVerified",
  );
  const token = user ? await findLiveOtp(user._id) : null;

  if (!user || !token) {
    // Spend the same hashing work as a real check so an unknown email is not
    // distinguishable by response time.
    codeMatches(code, DECOY_CODE_HASH);
    throw otpError("BAD_OTP");
  }

  // Checked before the code itself: once the cap is hit the OTP is dead, and
  // even the correct value must stop working. The document is deliberately left
  // findable so the user is told to request a new code rather than being told,
  // misleadingly, that a code they typed correctly is wrong.
  if (token.attempts >= MAX_OTP_ATTEMPTS) throw otpError("TOO_MANY_ATTEMPTS");
  if (token.expiresAt.getTime() <= Date.now()) throw otpError("OTP_EXPIRED");

  if (!codeMatches(code, token.tokenHash)) {
    const attempts = await registerOtpFailure(token.id);
    throw otpError(attempts >= MAX_OTP_ATTEMPTS ? "TOO_MANY_ATTEMPTS" : "BAD_OTP");
  }

  // Lost the race to a concurrent submission of the same code.
  if (!(await consumeOtpToken(token.id))) throw otpError("BAD_OTP");

  const alreadyVerified =
    user.status !== AccountStatus.PENDING && Boolean(user.emailVerified);
  await activateVerifiedUser(user._id);

  return { userId: user._id.toString(), alreadyVerified };
}
