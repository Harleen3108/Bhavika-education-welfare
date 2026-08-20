import mongoose, { Schema, type Model, type Types } from "mongoose";
import { CouponStatus, CouponSource } from "@/lib/enums";

/**
 * A coupon Bhavika ISSUES against a member's points.
 *
 * The points are debited in the same Mongo transaction that inserts this
 * document, so a coupon row existing is proof the points already left the
 * wallet — there is no window in which value is promised but not yet paid for.
 *
 * `pointsSpent` and `valueRupees` are stored, not derived: the conversion rate
 * lives in admin-editable settings, and a coupon printed as "₹500" must still
 * say ₹500 after an admin retunes the rate.
 */
export interface ICoupon {
  _id: Types.ObjectId;
  /** Human-dictatable, e.g. `BHAV-7K2X-9QM4-P8RT`. Unique. */
  code: string;
  user: Types.ObjectId;
  /** Face value in whole rupees. */
  valueRupees: number;
  /**
   * Points debited to create it. Zero for an admin-granted (promo) coupon,
   * which nobody paid points for. Forfeited if a POINTS coupon lapses on the
   * clock; refunded if an admin voids or force-expires it.
   */
  pointsSpent: number;
  status: CouponStatus;
  source: CouponSource;
  issuedAt: Date;
  /** After this instant the coupon is dead. */
  expiresAt: Date;
  redeemedAt?: Date | null;
  /**
   * When an admin returned the `pointsSpent` to the member (on a void or a
   * force-expire). Null while the points are still spent. Cleared again if a
   * voided coupon is reactivated and the points are re-debited.
   */
  refundedAt?: Date | null;
  /**
   * Monotonic counter of money-moving admin actions on this coupon. Every
   * refund and re-debit ledger row is keyed on it, so repeated
   * void→reactivate cycles cannot collide on one idempotency key.
   */
  ledgerSeq: number;
  /** The partner store's order id, recorded when they redeem it. */
  externalRef?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const CouponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, uppercase: true, trim: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    valueRupees: { type: Number, required: true, min: 1 },
    // min 0: an admin-granted promo coupon costs the member no points.
    pointsSpent: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: Object.values(CouponStatus),
      default: CouponStatus.ACTIVE,
      required: true,
    },
    source: {
      type: String,
      enum: Object.values(CouponSource),
      default: CouponSource.POINTS,
      required: true,
    },
    issuedAt: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date, required: true },
    redeemedAt: { type: Date, default: null },
    refundedAt: { type: Date, default: null },
    ledgerSeq: { type: Number, required: true, default: 0 },
    externalRef: { type: String, default: null },
  },
  { timestamps: true },
);

// The authority on code uniqueness. The generator pre-checks for a collision,
// but only this index can stop two concurrent issues from minting the same code.
CouponSchema.index({ code: 1 }, { unique: true });

// Serves the member's coupon list (user + status, newest first) and, by prefix,
// any per-user lookup. One compound index instead of three overlapping ones.
CouponSchema.index({ user: 1, status: 1, issuedAt: -1 });

// The expiry sweep: ACTIVE coupons whose expiresAt has passed.
//
// Deliberately NOT a TTL index. A TTL index would DELETE the document, erasing
// the record of points a member forfeited — exactly the thing that must stay
// visible. Expiry is a status transition here, never a deletion.
CouponSchema.index({ status: 1, expiresAt: 1 });

export const Coupon: Model<ICoupon> =
  (mongoose.models.Coupon as Model<ICoupon>) ||
  mongoose.model<ICoupon>("Coupon", CouponSchema);
