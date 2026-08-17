import { revalidatePath } from "next/cache";
import { handle, ok, DomainError } from "@/server/http";
import { requireAdmin } from "@/server/auth/session";
import { dbConnect } from "@/server/db/connect";
import { User, Wallet } from "@/server/models";
import { walletAdjustSchema } from "@/lib/validation/admin";
import { PointSource, TransactionType } from "@/lib/enums";
import { creditPoints } from "@/server/services/wallet.service";
import { logAdminAction } from "@/server/services/audit.service";

export const runtime = "nodejs";

/**
 * Manual point adjustment — the only way an admin may move a member's balance.
 *
 * Money-adjacent, so the rules are strict:
 *  - The change goes through `creditPoints()`, the ledger primitive. The Wallet
 *    document is never written directly; every balance move has a matching
 *    immutable WalletTransaction with the balance it produced.
 *  - Exactly-once is keyed on a `requestId` the browser mints per attempt. The
 *    ledger's unique index on `idempotencyKey` means a double-click, a retry
 *    after a timeout, or a replayed request all collapse into one transaction,
 *    and the caller is told it was already applied rather than silently
 *    charging the member twice.
 *  - A deduction can never leave a negative balance (see the floor check below).
 *  - Every applied adjustment lands in the AdminAuditLog with who, whom and why.
 */
export const POST = handle(async (req) => {
  const admin = await requireAdmin();
  const { userId, direction, points, description, requestId } = walletAdjustSchema.parse(
    await req.json(),
  );

  await dbConnect();

  const member = await User.findById(userId).select("name email").lean();
  if (!member) throw new DomainError("That member no longer exists.", 404, "NO_USER");

  const isDebit = direction === TransactionType.DEBIT;

  if (isDebit) {
    const wallet = await Wallet.findOne({ user: userId }).select("totalBalance").lean();
    const balance = wallet?.totalBalance ?? 0;
    if (balance < points) {
      throw new DomainError(
        `${member.name} holds ${balance} points — this deduction of ${points} would take the balance below zero.`,
        400,
        "INSUFFICIENT",
      );
    }
  }

  /*
    Namespaced by admin so one admin's request id can never collide with
    another's and silently swallow a genuine second adjustment.
  */
  const idempotencyKey = `admin-adjust:${admin.id}:${requestId}`;

  /*
    The member reads this line in their own wallet history, where the only other
    context is an "Adjustment" badge — so the attribution has to live in the
    text. Kept short deliberately: the member-facing list truncates to one line
    on a phone, and it is the admin's reason that must survive, not the prefix.
  */
  const prefix = isDebit ? "Deducted by admin" : "Credited by admin";

  const result = await creditPoints({
    userId,
    source: PointSource.ADJUSTMENT,
    points,
    type: isDebit ? TransactionType.DEBIT : TransactionType.CREDIT,
    referenceType: "AdminAdjustment",
    description: `${prefix} — ${description}`,
    idempotencyKey,
    createdBy: admin.id,
    meta: { reason: description, adminEmail: admin.email, requestId },
  });

  /*
    The balance floor, verified after the fact.

    The pre-check above is read-then-write: two admins deducting from the same
    member in the same instant can both pass it, and `creditPoints` has no floor
    of its own — it is a pure `$inc`. Rather than pretend the race cannot
    happen, we read the balance the transaction actually produced. If it went
    negative, the deduction is immediately reversed (with its own key, so the
    reversal is exactly-once too) and the admin is told it did not apply.
  */
  if (isDebit && result.credited && result.transaction.balanceAfter < 0) {
    await creditPoints({
      userId,
      source: PointSource.ADJUSTMENT,
      points,
      type: TransactionType.CREDIT,
      referenceType: "AdminAdjustmentReversal",
      referenceId: result.transaction._id,
      description: "Reversal — an admin deduction exceeded the available balance",
      idempotencyKey: `${idempotencyKey}:reversal`,
      createdBy: admin.id,
      meta: { reversalOf: result.transaction._id.toString() },
    });

    throw new DomainError(
      "Another change landed first and this deduction would have taken the member below zero. It has been reversed — check the balance and try again.",
      409,
      "INSUFFICIENT",
    );
  }

  // Only a transaction that actually applied is worth an audit row; a replayed
  // double-click would otherwise read as two separate decisions by the admin.
  if (result.credited) {
    await logAdminAction(admin.id, "wallet.adjust", {
      targetType: "User",
      targetId: userId,
      reason: `${isDebit ? "-" : "+"}${points} — ${description}`,
      meta: {
        direction,
        points,
        transactionId: result.transaction._id.toString(),
        balanceAfter: result.transaction.balanceAfter,
        idempotencyKey,
        memberEmail: member.email,
      },
    });
  }

  const wallet = await Wallet.findOne({ user: userId }).select("totalBalance").lean();

  revalidatePath("/admin/wallet");
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/dashboard/wallet");

  return ok({
    applied: result.credited,
    transactionId: result.transaction._id.toString(),
    balance: wallet?.totalBalance ?? 0,
    member: { id: userId, name: member.name },
  });
});
