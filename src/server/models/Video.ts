import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface IVideo {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  category?: string;
  videoUrl: string; // YouTube/Vimeo/embed URL
  thumbnailUrl?: string;
  order: number;
  active: boolean;
  createdBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const VideoSchema = new Schema<IVideo>(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 600 },
    category: { type: String, trim: true, index: true },
    videoUrl: { type: String, required: true, trim: true },
    thumbnailUrl: { type: String, trim: true },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

VideoSchema.index({ active: 1, order: 1, createdAt: -1 });

export const Video: Model<IVideo> =
  (mongoose.models.Video as Model<IVideo>) || mongoose.model<IVideo>("Video", VideoSchema);
