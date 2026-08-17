import mongoose, { Schema, type Model, type Types } from "mongoose";

/** Append-only record of sensitive admin actions. */
export interface IAdminAuditLog {
  _id: Types.ObjectId;
  admin: Types.ObjectId;
  action: string; // e.g. "user.block", "wallet.adjust", "quiz.create"
  targetType?: string;
  targetId?: Types.ObjectId | null;
  reason?: string;
  meta?: Record<string, unknown>;
  createdAt: Date;
}

const AdminAuditLogSchema = new Schema<IAdminAuditLog>(
  {
    admin: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    action: { type: String, required: true, index: true },
    targetType: { type: String },
    targetId: { type: Schema.Types.ObjectId, default: null },
    reason: { type: String },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

AdminAuditLogSchema.index({ createdAt: -1 });

export const AdminAuditLog: Model<IAdminAuditLog> =
  (mongoose.models.AdminAuditLog as Model<IAdminAuditLog>) ||
  mongoose.model<IAdminAuditLog>("AdminAuditLog", AdminAuditLogSchema);
