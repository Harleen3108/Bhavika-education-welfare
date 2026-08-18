"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dbConnect } from "@/server/db/connect";
import { User } from "@/server/models";
import { userStatusSchema } from "@/lib/validation/admin";
import { logAdminAction } from "@/server/services/audit.service";
import { runAdmin, type ActionResult } from "./util";

/**
 * Mark a member's email verified by hand.
 *
 * For the case where a member cannot receive mail at all — a mistyped address
 * they can prove, a blocked inbox, a school account — and would otherwise be
 * stuck at PENDING forever with no way in.
 *
 * Deliberately routed through the same `activateVerifiedUser` the OTP and
 * magic-link flows use, rather than setting the fields here. That helper also
 * settles any pending referral, so a member an admin verifies earns their
 * referrer the same reward as one who clicked the link. Writing the two fields
 * directly would silently skip that.
 */
export async function verifyUserEmail(input: unknown): Promise<ActionResult> {
  return runAdmin(async (admin) => {
    // Validated inline rather than in lib/validation/admin.ts: the only input is
    // an id, and that file is being edited concurrently.
    const userId = z.string().min(1, "A member is required.").parse(input);
    await dbConnect();

    const user = await User.findById(userId).select("status emailVerified").lean();
    if (!user) throw new Error("That member no longer exists.");

    const { activateVerifiedUser } = await import("@/server/services/otp.service");
    await activateVerifiedUser(userId);

    await logAdminAction(admin.id, "user.verify", {
      targetType: "User",
      targetId: userId,
      reason: "Email marked verified by an administrator",
    });

    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${userId}`);
  });
}

export async function setUserStatus(input: unknown): Promise<ActionResult> {
  return runAdmin(async (admin) => {
    const { userId, status, reason } = userStatusSchema.parse(input);
    await dbConnect();
    await User.updateOne({ _id: userId }, { $set: { status } });
    await logAdminAction(admin.id, "user.status", {
      targetType: "User",
      targetId: userId,
      reason: `${status}${reason ? ` — ${reason}` : ""}`,
    });
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${userId}`);
  });
}

/** Lift an admin lockout by hand, for when the owner is the one locked out. */
export async function releaseAdminLockout(input: unknown): Promise<ActionResult> {
  return runAdmin(async (admin) => {
    const email = z.string().email("A valid admin email is required.").parse(input);
    const { clearAdminLockout } = await import(
      "@/server/services/admin-security.service"
    );
    await clearAdminLockout(email);

    await logAdminAction(admin.id, "security.unlock", {
      targetType: "User",
      targetId: email,
      reason: "Admin lockout cleared manually",
    });
    revalidatePath("/admin/security");
  });
}
