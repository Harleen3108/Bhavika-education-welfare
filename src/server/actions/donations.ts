"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminDonationSchema, donationCategorySchema } from "@/lib/validation/donation";
import {
  adminRecordDonation,
  adminRevealPan,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/server/services/donation.service";
import { logAdminAction } from "@/server/services/audit.service";
import { DonationKind } from "@/lib/enums";
import { runAdmin, type ActionResult } from "./util";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id.");

/** Record an offline donation or issue a volunteer certificate. */
export async function recordDonationAction(
  input: unknown,
): Promise<ActionResult<{ id: string; receiptNo: string | null }>> {
  return runAdmin(async (admin) => {
    const data = adminDonationSchema.parse(input);
    const d = await adminRecordDonation(data, admin.id);
    await logAdminAction(admin.id, `donation.${data.kind === DonationKind.VOLUNTEER ? "volunteer" : "record"}`, {
      targetType: "Donation",
      targetId: d.id,
      reason: `${data.kind} — ${data.name}`,
      meta: { receiptNo: d.receiptNo, amount: d.amount, cause: d.categoryName },
    });
    revalidatePath("/admin/donations");
    revalidatePath("/dashboard/donations");
    return { id: d.id, receiptNo: d.receiptNo };
  });
}

/** Decrypt and return a donor's full PAN. Audited. */
export async function revealDonationPanAction(
  input: unknown,
): Promise<ActionResult<{ pan: string }>> {
  return runAdmin(async (admin) => {
    const id = objectId.parse((input as { donationId?: unknown })?.donationId);
    const pan = await adminRevealPan(id);
    await logAdminAction(admin.id, "donation.reveal", {
      targetType: "Donation",
      targetId: id,
      reason: "Viewed donor PAN",
    });
    return { pan: pan ?? "" };
  });
}

/** Create or update a donation cause. */
export async function saveCauseAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAdmin(async (admin) => {
    const data = donationCategorySchema.parse(input);
    const rawId = (input as { id?: unknown })?.id;
    let id: string;
    if (rawId) {
      id = objectId.parse(rawId);
      await updateCategory(id, data);
    } else {
      id = (await createCategory(data)).id;
    }
    await logAdminAction(admin.id, "donation.cause.save", {
      targetType: "DonationCategory",
      targetId: id,
      reason: data.name,
    });
    revalidatePath("/admin/donations");
    return { id };
  });
}

/** Remove a cause (existing donations keep their snapshotted cause name). */
export async function deleteCauseAction(input: unknown): Promise<ActionResult> {
  return runAdmin(async (admin) => {
    const id = objectId.parse((input as { id?: unknown })?.id);
    await deleteCategory(id);
    await logAdminAction(admin.id, "donation.cause.delete", {
      targetType: "DonationCategory",
      targetId: id,
    });
    revalidatePath("/admin/donations");
  });
}
