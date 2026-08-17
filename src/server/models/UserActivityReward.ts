import mongoose, { Schema, type Model, type Types } from "mongoose";

/**
 * Records each time a user has been granted an activity reward. The unique
 * compound index on (user, activityKey, grantKey) enforces the per-user cap and
 * prevents an API from being replayed to farm unlimited points.
 *
 * `grantKey` distinguishes repeatable grants (e.g. "event-2026-01"); for
 * one-time rewards it is simply the activityKey.
 */
export interface IUserActivityReward {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  activityKey: string;
  grantKey: string;
  points: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserActivityRewardSchema = new Schema<IUserActivityReward>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    activityKey: { type: String, required: true },
    grantKey: { type: String, required: true },
    points: { type: Number, required: true },
  },
  { timestamps: true },
);

UserActivityRewardSchema.index(
  { user: 1, activityKey: 1, grantKey: 1 },
  { unique: true },
);

export const UserActivityReward: Model<IUserActivityReward> =
  (mongoose.models.UserActivityReward as Model<IUserActivityReward>) ||
  mongoose.model<IUserActivityReward>("UserActivityReward", UserActivityRewardSchema);
