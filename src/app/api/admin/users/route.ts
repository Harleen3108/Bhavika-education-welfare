import type { Types } from "mongoose";
import { revalidatePath } from "next/cache";
import { handle, ok, DomainError } from "@/server/http";
import { requireAdmin } from "@/server/auth/session";
import { dbConnect, withTransaction } from "@/server/db/connect";
import { User, Wallet } from "@/server/models";
import { AccountStatus, UserRole } from "@/lib/enums";
import { adminCreateUserSchema } from "@/lib/validation/admin";
import { hashPassword } from "@/server/auth/password";
import {
  generateUniqueReferralCode,
  resolveReferrer,
  recordReferral,
  processReferralReward,
} from "@/server/services/referral.service";
import { adminSearchMembers } from "@/server/services/admin-read.service";
import { logAdminAction } from "@/server/services/audit.service";

export const runtime = "nodejs";

/** Member typeahead for admin pickers (wallet adjustment). */
export const GET = handle(async (req) => {
  await requireAdmin();
  const q = new URL(req.url).searchParams.get("q") ?? "";
  return ok({ items: await adminSearchMembers(q) });
});

/**
 * Create a member without the email round-trip.
 *
 * Registration normally leaves the account PENDING until a link or code is
 * confirmed; here an admin is vouching for the person in front of them, so the
 * account is born ACTIVE and already verified and no mail is sent. Everything
 * else is exactly what `registerUser` builds — the same hashing, the same
 * wallet, the same referral bookkeeping — because a member created this way
 * must be indistinguishable from one who signed up on their own. Reusing those
 * primitives is what keeps that true as they evolve.
 */
export const POST = handle(async (req) => {
  const admin = await requireAdmin();
  const { name, email, password, referralCode } = adminCreateUserSchema.parse(await req.json());

  await dbConnect();

  const existing = await User.exists({ email });
  if (existing) {
    throw new DomainError("An account with this email already exists.", 409, "EMAIL_TAKEN");
  }

  // A typo'd code fails loudly rather than quietly dropping the attribution —
  // the admin is entering it on someone's behalf and cannot see it not work.
  const rawCode = referralCode ?? "";
  const referrerId = rawCode ? await resolveReferrer(rawCode) : null;
  if (rawCode && !referrerId) {
    throw new DomainError(`No member owns the referral code ${rawCode}.`, 400, "BAD_REFERRAL");
  }

  const ownReferralCode = await generateUniqueReferralCode();
  const passwordHash = await hashPassword(password);

  const userId = await withTransaction(async (session) => {
    const [user] = await User.create(
      [
        {
          name,
          email,
          passwordHash,
          // Role is never taken from the request: creating an admin is a
          // separate, deliberate act, not a checkbox on the member form.
          role: UserRole.USER,
          status: AccountStatus.ACTIVE,
          emailVerified: new Date(),
          referralCode: ownReferralCode,
          referrer: referrerId,
          referralCodeUsed: rawCode || null,
        },
      ],
      { session },
    );

    await Wallet.create([{ user: user._id }], { session });

    if (referrerId) {
      await recordReferral(referrerId, user._id as Types.ObjectId, rawCode, session);
    }

    return (user._id as Types.ObjectId).toString();
  });

  // This account is verified from birth, so the gate that email verification
  // would normally open is already open. Idempotent and non-fatal, exactly as
  // it is on the verification path.
  if (referrerId) {
    try {
      await processReferralReward(userId);
    } catch (err) {
      console.error("[admin] referral qualification hook failed:", err);
    }
  }

  await logAdminAction(admin.id, "user.create", {
    targetType: "User",
    targetId: userId,
    reason: `Created ${email} (pre-verified)`,
    meta: { email, referralCode: ownReferralCode, referredBy: referrerId?.toString() ?? null },
  });

  revalidatePath("/admin/users");

  return ok({ id: userId, name, email, referralCode: ownReferralCode }, { status: 201 });
});
