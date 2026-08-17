import mongoose, { Schema, type Model, type Types } from "mongoose";
import { ContactStatus } from "@/lib/enums";

export interface IContactSubmission {
  _id: Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  status: ContactStatus;
  ipHash?: string; // hashed IP for abuse investigation (no raw PII)
  createdAt: Date;
  updatedAt: Date;
}

const ContactSubmissionSchema = new Schema<IContactSubmission>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 160 },
    phone: { type: String, trim: true, maxlength: 20 },
    subject: { type: String, trim: true, maxlength: 160 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    status: {
      type: String,
      enum: Object.values(ContactStatus),
      default: ContactStatus.NEW,
      index: true,
    },
    ipHash: { type: String },
  },
  { timestamps: true },
);

ContactSubmissionSchema.index({ createdAt: -1 });

export const ContactSubmission: Model<IContactSubmission> =
  (mongoose.models.ContactSubmission as Model<IContactSubmission>) ||
  mongoose.model<IContactSubmission>("ContactSubmission", ContactSubmissionSchema);
