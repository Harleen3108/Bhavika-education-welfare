import mongoose, { Schema, type Model, type Types } from "mongoose";

/**
 * Flexible CMS block keyed by a stable identifier (e.g. "home.hero",
 * "about.main", "mission", "vision", "contact.info"). `data` holds an
 * arbitrary JSON shape validated at the service/Zod layer per key.
 */
export interface IContent {
  _id: Types.ObjectId;
  key: string;
  title?: string;
  data: Record<string, unknown>;
  updatedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const ContentSchema = new Schema<IContent>(
  {
    key: { type: String, required: true, unique: true, index: true },
    title: { type: String, trim: true },
    data: { type: Schema.Types.Mixed, default: {} },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

export const Content: Model<IContent> =
  (mongoose.models.Content as Model<IContent>) ||
  mongoose.model<IContent>("Content", ContentSchema);
