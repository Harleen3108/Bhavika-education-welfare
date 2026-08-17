import mongoose, { Schema, type Model, type Types } from "mongoose";
import { ReferralStatus } from "@/lib/enums";

/**
 * One row per referred user (unique on `referredUser`), so a person can only
 * ever be referred once. Reward is paid exactly once via status transition to
 * REWARDED plus a wallet idempotency key.
 */
export interface IReferral {
  _id: Types.ObjectId;
  referrer: Types.ObjectId; // User A
  referredUser: Types.ObjectId; // User B
  referralCode: string; // code used at signup
  status: ReferralStatus;

  qualifiedAt: Date | null;
  rewardedAt: Date | null;
  rewardPoints: number;
  rejectionReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

const ReferralSchema = new Schema<IReferral>(
  {
    referrer: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    referredUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // a user can be referred at most once
    },
    referralCode: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(ReferralStatus),
      default: ReferralStatus.PENDING,
      index: true,
    },
    qualifiedAt: { type: Date, default: null },
    rewardedAt: { type: Date, default: null },
    rewardPoints: { type: Number, default: 0 },
    rejectionReason: { type: String },
  },
  { timestamps: true },
);

ReferralSchema.index({ referrer: 1, status: 1 });

export const Referral: Model<IReferral> =
  (mongoose.models.Referral as Model<IReferral>) ||
  mongoose.model<IReferral>("Referral", ReferralSchema);
