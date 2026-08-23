import mongoose, { Schema, type Model, type Types } from "mongoose";

/**
 * A cause a donor can give to — "Food donation", "Women empowerment", etc.
 * Admin-managed so the foundation can add or retire causes without a redeploy.
 */
export interface IDonationCategory {
  _id: Types.ObjectId;
  name: string;
  nameHi?: string;
  description?: string;
  active: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const DonationCategorySchema = new Schema<IDonationCategory>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    nameHi: { type: String, trim: true, maxlength: 120, default: "" },
    description: { type: String, trim: true, maxlength: 300, default: "" },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

DonationCategorySchema.index({ active: 1, order: 1 });

export const DonationCategory: Model<IDonationCategory> =
  (mongoose.models.DonationCategory as Model<IDonationCategory>) ||
  mongoose.model<IDonationCategory>("DonationCategory", DonationCategorySchema);
