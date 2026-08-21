"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { idCardActionSchema, adminIssueIdCardSchema } from "@/lib/validation/idcard";
import {
  approveCard,
  rejectCard,
  adminIssueCard,
  adminRevealCard,
} from "@/server/services/idcard.service";
import { logAdminAction } from "@/server/services/audit.service";
import { runAdmin, type ActionResult } from "./util";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid card id.");

/** Approve or reject a pending ID card request. */
export async function idCardAction(
  input: unknown,
): Promise<ActionResult<{ status: string; memberId: string | null }>> {
  return runAdmin(async (admin) => {
    const { cardId, action, reason } = idCardActionSchema.parse(input);
    const card =
      action === "approve"
        ? await approveCard(cardId, admin.id)
        : await rejectCard(cardId, admin.id, reason || "");

    await logAdminAction(admin.id, `idcard.${action}`, {
      targetType: "IdCard",
      targetId: cardId,
      reason: reason || undefined,
      meta: { memberId: card.memberId, status: card.status },
    });

    revalidatePath("/admin/id-cards");
    revalidatePath("/dashboard/id-card");
    return { status: card.status, memberId: card.memberId };
  });
}

/** Admin creates an approved card on a member's behalf. */
export async function adminIssueIdCardAction(
  input: unknown,
): Promise<ActionResult<{ memberId: string | null }>> {
  return runAdmin(async (admin) => {
    const { userId, fatherName, address, aadhaar, pan, photoUrl } =
      adminIssueIdCardSchema.parse(input);
    const card = await adminIssueCard({
      userId,
      fatherName,
      address,
      aadhaar,
      pan,
      photoUrl,
      adminId: admin.id,
    });

    await logAdminAction(admin.id, "idcard.issue", {
      targetType: "User",
      targetId: userId,
      reason: "Admin-issued ID card",
      meta: { cardId: card.id, memberId: card.memberId },
    });

    revalidatePath("/admin/id-cards");
    revalidatePath(`/admin/users/${userId}`);
    revalidatePath("/dashboard/id-card");
    return { memberId: card.memberId };
  });
}

/** Decrypt and return the full Aadhaar/PAN for a card. Audited. */
export async function revealIdCardPii(
  input: unknown,
): Promise<ActionResult<{ aadhaar: string; pan: string }>> {
  return runAdmin(async (admin) => {
    const cardId = objectId.parse((input as { cardId?: unknown })?.cardId);
    const pii = await adminRevealCard(cardId);
    if (!pii) throw new Error("That card no longer exists.");
    await logAdminAction(admin.id, "idcard.reveal", {
      targetType: "IdCard",
      targetId: cardId,
      reason: "Viewed full Aadhaar/PAN for KYC verification",
    });
    return pii;
  });
}
