import mongoose, { Schema, type Model, type Types } from "mongoose";

/**
 * Wallet holds the CURRENT denormalized balances for fast reads.
 * It is NEVER the source of truth on its own — every change is mirrored by a
 * WalletTransaction ledger entry written in the same Mongo transaction.
 */
export interface IWallet {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  totalBalance: number;
  quizBalance: number;
  referralBalance: number;
  activityBalance: number;
  // Lifetime totals (never decremented) — useful for leaderboards & stats.
  lifetimeQuizPoints: number;
  updatedAt: Date;
  createdAt: Date;
}

const WalletSchema = new Schema<IWallet>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    totalBalance: { type: Number, default: 0, min: 0 },
    quizBalance: { type: Number, default: 0, min: 0 },
    referralBalance: { type: Number, default: 0, min: 0 },
    activityBalance: { type: Number, default: 0, min: 0 },
    lifetimeQuizPoints: { type: Number, default: 0, min: 0, index: true },
  },
  { timestamps: true },
);

export const Wallet: Model<IWallet> =
  (mongoose.models.Wallet as Model<IWallet>) ||
  mongoose.model<IWallet>("Wallet", WalletSchema);
