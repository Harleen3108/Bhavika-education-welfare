import mongoose, { Schema, type Model, type Types } from "mongoose";

/**
 * Singleton settings document (single row keyed by `singleton: "global"`).
 * Holds live business rules so admins can tune them without a redeploy.
 * Shape mirrors DEFAULT_SETTINGS in lib/constants.
 */
export interface ISystemSettings {
  _id: Types.ObjectId;
  singleton: "global";
  referral: {
    referrerReward: number;
    referredReward: number;
    requireEmailVerification: boolean;
    requireFirstQuiz: boolean;
  };
  quiz: {
    defaultTimeLimitSeconds: number;
    defaultMaxAttempts: number;
    defaultPointsPerCorrect: number;
  };
  activity: {
    profileCompletionPoints: number;
  };
  integration: {
    redemptionEnabled: boolean;
    minRedeemPoints: number;
    pointsPerRupee: number;
    redeemStepPoints: number;
    couponValidityDays: number;
  };
  updatedBy?: Types.ObjectId | null;
  updatedAt: Date;
  createdAt: Date;
}

const SystemSettingsSchema = new Schema<ISystemSettings>(
  {
    singleton: {
      type: String,
      enum: ["global"],
      default: "global",
      unique: true,
      index: true,
    },
    referral: {
      referrerReward: { type: Number, default: 50 },
      referredReward: { type: Number, default: 0 },
      requireEmailVerification: { type: Boolean, default: true },
      requireFirstQuiz: { type: Boolean, default: true },
    },
    quiz: {
      defaultTimeLimitSeconds: { type: Number, default: 300 },
      defaultMaxAttempts: { type: Number, default: 1 },
      defaultPointsPerCorrect: { type: Number, default: 10 },
    },
    activity: {
      profileCompletionPoints: { type: Number, default: 20 },
    },
    integration: {
      redemptionEnabled: { type: Boolean, default: false },
      // Redemption economics live here rather than in code so an admin can
      // retune the threshold and the rate without a redeploy.
      minRedeemPoints: { type: Number, default: 5000, min: 1 },
      pointsPerRupee: { type: Number, default: 10, min: 1 },
      redeemStepPoints: { type: Number, default: 500, min: 1 },
      // How long an issued coupon stays usable before it is forfeited. Tunable
      // because it is a promise made to members, not a technical detail.
      couponValidityDays: { type: Number, default: 90, min: 1 },
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

export const SystemSettings: Model<ISystemSettings> =
  (mongoose.models.SystemSettings as Model<ISystemSettings>) ||
  mongoose.model<ISystemSettings>("SystemSettings", SystemSettingsSchema);
