import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface IGalleryItem {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  category?: string;
  imageUrl: string; // Cloudinary secure URL
  publicId?: string; // Cloudinary public_id (for deletion)
  width?: number;
  height?: number;
  order: number;
  active: boolean;
  createdBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const GalleryItemSchema = new Schema<IGalleryItem>(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 600 },
    category: { type: String, trim: true, index: true },
    imageUrl: { type: String, required: true },
    publicId: { type: String },
    width: { type: Number },
    height: { type: Number },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

GalleryItemSchema.index({ active: 1, order: 1, createdAt: -1 });

export const GalleryItem: Model<IGalleryItem> =
  (mongoose.models.GalleryItem as Model<IGalleryItem>) ||
  mongoose.model<IGalleryItem>("GalleryItem", GalleryItemSchema);
