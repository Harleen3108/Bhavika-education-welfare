import mongoose, { Schema, type Model, type Types } from "mongoose";
import { UserRole } from "@/lib/enums";

/**
 * Brute-force state for one admin identity.
 *
 * Kept per email rather than per IP on purpose: an attacker rotates addresses
 * far more cheaply than they guess a password, so an IP-only counter is trivial
 * to walk around. The IP is still recorded on every attempt for investigation.
 *
 * `level` survives the lockout expiring — that is what makes each subsequent
 * round longer instead of resetting an attacker to a fresh 5-minute penalty
 * every time they wait one out. Only a successful sign-in clears it.
 */
export interface IAdminLockout {
  _id: Types.ObjectId;
  email: string;
  /** Which kind of account this guards. Thresholds differ by role. */
  role: UserRole;
  /** Failures since the last success or lockout. */
  failedCount: number;
  /** How many lockouts this identity has served. Drives the escalating delay. */
  level: number;
  lockedUntil: Date | null;
  lastFailedAt: Date | null;
  lastIp?: string | null;
  /** So one lockout does not send the same warning email repeatedly. */
  notifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const AdminLockoutSchema = new Schema<IAdminLockout>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    role: { type: String, enum: Object.values(UserRole), default: UserRole.ADMIN },
    failedCount: { type: Number, default: 0, min: 0 },
    level: { type: Number, default: 0, min: 0 },
    lockedUntil: { type: Date, default: null },
    lastFailedAt: { type: Date, default: null },
    lastIp: { type: String, default: null },
    notifiedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const AdminLockout: Model<IAdminLockout> =
  (mongoose.models.AdminLockout as Model<IAdminLockout>) ||
  mongoose.model<IAdminLockout>("AdminLockout", AdminLockoutSchema);
