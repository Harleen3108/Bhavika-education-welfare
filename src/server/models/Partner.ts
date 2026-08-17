import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface IPartner {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  logoUrl?: string;
  websiteUrl?: string;
  order: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PartnerSchema = new Schema<IPartner>(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 500 },
    logoUrl: { type: String, trim: true },
    websiteUrl: { type: String, trim: true },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

PartnerSchema.index({ active: 1, order: 1 });

export const Partner: Model<IPartner> =
  (mongoose.models.Partner as Model<IPartner>) ||
  mongoose.model<IPartner>("Partner", PartnerSchema);
