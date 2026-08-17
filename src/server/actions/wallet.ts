"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { dbConnect } from "@/server/db/connect";
import { Wallet } from "@/server/models";
import { adjustmentSchema } from "@/lib/validation/admin";
import { PointSource, TransactionType } from "@/lib/enums";
import { creditPoints } from "@/server/services/wallet.service";
import { logAdminAction } from "@/server/services/audit.service";
import { DomainError } from "@/server/http";
import { runAdmin, type ActionResult } from "./util";

/**
 * Manual point adjustment (credit or debit). Always audited, always requires a
 * reason, always creates a ledger transaction — balances are never edited silently.
 */
export async function adjustPoints(input: unknown): Promise<ActionResult> {
  return runAdmin(async (admin) => {
    const { userId, points, reason } = adjustmentSchema.parse(input);
    await dbConnect();

    const isDebit = points < 0;
    if (isDebit) {
      const wallet = await Wallet.findOne({ user: userId }).lean();
      if (!wallet || wallet.totalBalance < Math.abs(points)) {
        throw new DomainError("Debit exceeds the user's current balance.", 400, "INSUFFICIENT");
      }
    }

    await creditPoints({
      userId,
      source: PointSource.ADJUSTMENT,
      points: Math.abs(points),
      type: isDebit ? TransactionType.DEBIT : TransactionType.CREDIT,
      referenceType: "AdminAdjustment",
      description: `Admin adjustment: ${reason}`,
      idempotencyKey: `adjust:${randomUUID()}`,
      createdBy: admin.id,
      meta: { reason },
    });

    await logAdminAction(admin.id, "wallet.adjust", {
      targetType: "User",
      targetId: userId,
      reason: `${points > 0 ? "+" : ""}${points} — ${reason}`,
    });

    revalidatePath("/admin/wallet");
    revalidatePath(`/admin/users/${userId}`);
  });
}
