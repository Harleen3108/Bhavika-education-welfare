import mongoose, { Schema, type Model, type Types } from "mongoose";
import { IdCardStatus } from "@/lib/enums";

/**
 * A member's foundation ID card and the KYC behind it.
 *
 * One document per member (unique index on `user`): resubmitting after a
 * rejection updates this same row rather than piling up requests. The `memberId`
 * — the number printed on the card — is allocated once, when the card is first
 * APPROVED, and is unique and immutable thereafter.
 *
 * Aadhaar and PAN are never stored in the clear: `aadhaarEnc` / `panEnc` hold
 * AES-256-GCM ciphertext (see server/crypto/pii), and only the last four digits
 * are kept in plaintext so an admin can eyeball a match without decrypting.
 * Neither number is ever printed on the card itself.
 */
export interface IIdCard {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  /** Printed card number, e.g. `BHAV-2026-004821`. Assigned on first approval. */
  memberId?: string | null;
  status: IdCardStatus;

  // Snapshotted onto the card at issue time so a later profile edit never
  // silently changes an already-printed card.
  fullName: string;
  fatherName: string;
  address: string;
  city: string;
  /** Cloudinary URL of the member's photo (also their profile avatar). */
  photoUrl: string;

  // Encrypted PII — admin-only, decrypted on demand for KYC verification.
  aadhaarEnc: string;
  panEnc: string;
  aadhaarLast4: string;
  panLast4: string;

  /** True when an admin created the card on the member's behalf. */
  issuedByAdmin: boolean;
  reviewedBy?: Types.ObjectId | null;
  reviewedAt?: Date | null;
  rejectionReason?: string | null;
  approvedAt?: Date | null;
  /** After this instant the card should be treated as lapsed. */
  expiresAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

const IdCardSchema = new Schema<IIdCard>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    memberId: { type: String, default: null, uppercase: true, trim: true },
    status: {
      type: String,
      enum: Object.values(IdCardStatus),
      default: IdCardStatus.PENDING,
      required: true,
    },
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    fatherName: { type: String, required: true, trim: true, maxlength: 120 },
    address: { type: String, required: true, trim: true, maxlength: 300 },
    city: { type: String, default: "", trim: true, maxlength: 120 },
    photoUrl: { type: String, default: "" },

    aadhaarEnc: { type: String, required: true },
    panEnc: { type: String, required: true },
    aadhaarLast4: { type: String, required: true },
    panLast4: { type: String, required: true },

    issuedByAdmin: { type: Boolean, default: false },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null },
    approvedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// One card per member — the whole feature is "unique ID per user".
IdCardSchema.index({ user: 1 }, { unique: true });
// The card number is unique when present; PENDING cards have none yet.
IdCardSchema.index({ memberId: 1 }, { unique: true, sparse: true });
// The admin review queue: newest requests in a given status first.
IdCardSchema.index({ status: 1, createdAt: -1 });

export const IdCard: Model<IIdCard> =
  (mongoose.models.IdCard as Model<IIdCard>) ||
  mongoose.model<IIdCard>("IdCard", IdCardSchema);
