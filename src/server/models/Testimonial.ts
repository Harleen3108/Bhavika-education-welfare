import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface ITestimonial {
  _id: Types.ObjectId;
  name: string;
  role?: string; // role or location
  message: string;
  imageUrl?: string;
  order: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TestimonialSchema = new Schema<ITestimonial>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    role: { type: String, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 800 },
    imageUrl: { type: String, trim: true },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

TestimonialSchema.index({ active: 1, order: 1 });

export const Testimonial: Model<ITestimonial> =
  (mongoose.models.Testimonial as Model<ITestimonial>) ||
  mongoose.model<ITestimonial>("Testimonial", TestimonialSchema);
