import mongoose, { Schema, type Model, type Types } from "mongoose";
import {
  PointSource,
  TransactionType,
  TransactionStatus,
} from "@/lib/enums";

/**
 * Immutable ledger entry. One per point change. The `idempotencyKey` unique
 * index is the core defense against double-crediting on retries / double-clicks.
 */
export interface IWalletTransaction {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  source: PointSource;
  type: TransactionType;
  /** Signed amount: positive for CREDIT, negative for DEBIT/REVERSAL. */
  points: number;
  balanceAfter: number;

  referenceType: string; // e.g. "QuizAttempt", "Referral", "ActivityReward", "AdminAdjustment"
  referenceId?: Types.ObjectId | null;

  description: string;
  status: TransactionStatus;

  /** Deterministic key that makes each economic event credit exactly once. */
  idempotencyKey: string;

  /** For admin adjustments / audits. */
  createdBy?: Types.ObjectId | null;
  meta?: Record<string, unknown>;

  createdAt: Date;
  updatedAt: Date;
}

const WalletTransactionSchema = new Schema<IWalletTransaction>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    source: { type: String, enum: Object.values(PointSource), required: true },
    type: { type: String, enum: Object.values(TransactionType), required: true },
    points: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },

    referenceType: { type: String, required: true },
    referenceId: { type: Schema.Types.ObjectId, default: null },

    description: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(TransactionStatus),
      default: TransactionStatus.COMPLETED,
    },

    idempotencyKey: { type: String, required: true },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

// Exactly-once guarantee: two events with the same key can never both persist.
WalletTransactionSchema.index({ idempotencyKey: 1 }, { unique: true });
// Fast per-user history (newest first).
WalletTransactionSchema.index({ user: 1, createdAt: -1 });
// Admin investigation by reference.
WalletTransactionSchema.index({ referenceType: 1, referenceId: 1 });

export const WalletTransaction: Model<IWalletTransaction> =
  (mongoose.models.WalletTransaction as Model<IWalletTransaction>) ||
  mongoose.model<IWalletTransaction>("WalletTransaction", WalletTransactionSchema);
