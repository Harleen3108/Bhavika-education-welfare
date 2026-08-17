import mongoose, { Schema, type Model, type Types } from "mongoose";

/**
 * Admin-configurable catalogue of point-earning activities
 * (e.g. "profile_completion", "attend_event_x").
 */
export interface IActivityReward {
  _id: Types.ObjectId;
  key: string; // stable identifier used by the server to grant it
  name: string;
  description?: string;
  points: number;
  maxPerUser: number; // 0 = unlimited (rare); default 1
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ActivityRewardSchema = new Schema<IActivityReward>(
  {
    key: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 500 },
    points: { type: Number, required: true, min: 0 },
    maxPerUser: { type: Number, default: 1, min: 0 },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const ActivityReward: Model<IActivityReward> =
  (mongoose.models.ActivityReward as Model<IActivityReward>) ||
  mongoose.model<IActivityReward>("ActivityReward", ActivityRewardSchema);
