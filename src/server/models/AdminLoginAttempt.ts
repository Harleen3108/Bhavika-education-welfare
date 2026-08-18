import mongoose, { Schema, type Model, type Types } from "mongoose";

/**
 * Every admin sign-in attempt, successful or not.
 *
 * This is a security log, so unlike the rest of the app it stores the raw IP
 * rather than a salted hash: an administrator investigating a break-in needs to
 * see, block and report the actual address. Retention is bounded by a TTL index
 * instead — the record expires rather than being anonymised.
 */

/** Which step of the multi-step admin login produced the record. */
export type AdminAuthStage = "LOOKUP" | "PASSWORD" | "CODE" | "SESSION";

export interface IAdminLoginAttempt {
  _id: Types.ObjectId;
  email: string;
  success: boolean;
  stage: AdminAuthStage;
  /** Why it failed, for the admin-facing log. Never shown to the person trying. */
  reason?: string | null;

  ip: string;
  ipHash: string;
  userAgent?: string | null;

  // Approximate, from the edge network's own geo headers. City-level at best.
  country?: string | null;
  region?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;

  /** Network intelligence. `vpnSuspected` is a heuristic, never a verdict. */
  asn?: string | null;
  org?: string | null;
  vpnSuspected: boolean;
  vpnReason?: string | null;

  createdAt: Date;
}

const AdminLoginAttemptSchema = new Schema<IAdminLoginAttempt>(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    success: { type: Boolean, required: true, index: true },
    stage: {
      type: String,
      enum: ["LOOKUP", "PASSWORD", "CODE", "SESSION"],
      required: true,
    },
    reason: { type: String, default: null },

    ip: { type: String, required: true, index: true },
    ipHash: { type: String, required: true },
    userAgent: { type: String, default: null },

    country: { type: String, default: null },
    region: { type: String, default: null },
    city: { type: String, default: null },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },

    asn: { type: String, default: null },
    org: { type: String, default: null },
    vpnSuspected: { type: Boolean, default: false, index: true },
    vpnReason: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Newest-first listing, and the per-email windowed count the lockout uses.
AdminLoginAttemptSchema.index({ createdAt: -1 });
AdminLoginAttemptSchema.index({ email: 1, createdAt: -1 });

// Security logs are only useful while fresh, and holding raw IPs forever is a
// liability rather than an asset. Six months.
AdminLoginAttemptSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 });

export const AdminLoginAttempt: Model<IAdminLoginAttempt> =
  (mongoose.models.AdminLoginAttempt as Model<IAdminLoginAttempt>) ||
  mongoose.model<IAdminLoginAttempt>("AdminLoginAttempt", AdminLoginAttemptSchema);
