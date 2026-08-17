import "server-only";
import type { Types } from "mongoose";
import { dbConnect } from "@/server/db/connect";
import { AdminAuditLog } from "@/server/models";

/** Append an admin action to the immutable audit log. Best-effort (never throws). */
export async function logAdminAction(
  adminId: string | Types.ObjectId,
  action: string,
  opts: {
    targetType?: string;
    targetId?: string | Types.ObjectId | null;
    reason?: string;
    meta?: Record<string, unknown>;
  } = {},
): Promise<void> {
  try {
    await dbConnect();
    await AdminAuditLog.create({
      admin: adminId,
      action,
      targetType: opts.targetType,
      targetId: opts.targetId ?? null,
      reason: opts.reason,
      meta: opts.meta,
    });
  } catch (err) {
    console.error("[audit] failed to log action:", action, err);
  }
}

export type AuditRow = {
  id: string;
  admin: string;
  action: string;
  targetType?: string;
  reason?: string;
  createdAt: string;
};

export async function listAuditLogs(limit = 50): Promise<AuditRow[]> {
  await dbConnect();
  const logs = await AdminAuditLog.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate<{ admin: { name: string } }>("admin", "name")
    .lean();
  return logs.map((l) => ({
    id: l._id.toString(),
    admin: l.admin?.name ?? "Admin",
    action: l.action,
    targetType: l.targetType,
    reason: l.reason,
    createdAt: l.createdAt.toISOString(),
  }));
}
