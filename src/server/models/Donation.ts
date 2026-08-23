import mongoose, { Schema, type Model, type Types } from "mongoose";
import { DonationStatus, DonationKind, DonationSource } from "@/lib/enums";

/**
 * A donation (or an admin-issued volunteer certificate).
 *
 * Login is not required to donate: `donorEmail` is always captured and `user`
 * is null for a guest. When someone later signs up with that email, their past
 * donations are matched by email — so nothing is lost by giving before
 * registering. PAN is optional and, like other stored PII, kept encrypted
 * (`panEnc`) with only the last four in the clear.
 */
export interface IDonation {
  _id: Types.ObjectId;
  /** Human-facing receipt number, e.g. `BF/2026/000123`. Assigned once paid. */
  receiptNo?: string | null;
  kind: DonationKind;
  source: DonationSource;
  status: DonationStatus;

  /** Linked account, if the donor was (or later becomes) a member. */
  user?: Types.ObjectId | null;
  donorName: string;
  donorEmail: string;
  donorPhone?: string;
  /** Guptdan — hide the donor's identity in any public/admin listing. */
  anonymous: boolean;

  // Optional PAN, encrypted at rest.
  panEnc?: string | null;
  panLast4?: string | null;

  /** Whole rupees. Zero for a volunteer certificate. */
  amount: number;
  /** Snapshot of the chosen cause. */
  category?: Types.ObjectId | null;
  categoryName: string;
  /** Free-text note (e.g. the volunteering described on a volunteer certificate). */
  message?: string;

  // Razorpay (ONLINE only).
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;

  /** Unguessable token so a guest can download their receipt from the email link. */
  receiptToken: string;

  paidAt?: Date | null;
  /** Admin who recorded a MANUAL donation / volunteer certificate. */
  createdBy?: Types.ObjectId | null;

  createdAt: Date;
  updatedAt: Date;
}

const DonationSchema = new Schema<IDonation>(
  {
    receiptNo: { type: String, default: null, trim: true },
    kind: { type: String, enum: Object.values(DonationKind), default: DonationKind.DONATION, required: true },
    source: { type: String, enum: Object.values(DonationSource), default: DonationSource.ONLINE, required: true },
    status: { type: String, enum: Object.values(DonationStatus), default: DonationStatus.CREATED, required: true },

    user: { type: Schema.Types.ObjectId, ref: "User", default: null },
    donorName: { type: String, required: true, trim: true, maxlength: 120 },
    donorEmail: { type: String, required: true, lowercase: true, trim: true },
    donorPhone: { type: String, trim: true, maxlength: 20, default: "" },
    anonymous: { type: Boolean, default: false },

    panEnc: { type: String, default: null },
    panLast4: { type: String, default: null },

    amount: { type: Number, required: true, min: 0 },
    category: { type: Schema.Types.ObjectId, ref: "DonationCategory", default: null },
    categoryName: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, trim: true, maxlength: 500, default: "" },

    razorpayOrderId: { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },

    receiptToken: { type: String, required: true },

    paidAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

// The receipt number is unique among issued (paid) donations only — a CREATED
// order has none yet, so a partial index keeps those nulls out of the constraint.
DonationSchema.index(
  { receiptNo: 1 },
  { unique: true, partialFilterExpression: { receiptNo: { $type: "string" } } },
);
// Match a guest's past donations to their account by email.
DonationSchema.index({ donorEmail: 1, status: 1, createdAt: -1 });
DonationSchema.index({ user: 1, createdAt: -1 });
// Look a Razorpay order back up on verify / webhook.
DonationSchema.index({ razorpayOrderId: 1 });
// Admin queue.
DonationSchema.index({ status: 1, createdAt: -1 });

export const Donation: Model<IDonation> =
  (mongoose.models.Donation as Model<IDonation>) ||
  mongoose.model<IDonation>("Donation", DonationSchema);
