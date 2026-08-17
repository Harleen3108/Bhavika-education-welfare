import mongoose, { Schema, type Model, type Types } from "mongoose";

/**
 * One-time secrets: email-verification links, the 6-digit email OTP, and
 * password-reset links. Only a hash is stored — the raw value lives only in the
 * email we send. TTL index auto-expires documents at `expiresAt`.
 */
export type TokenPurpose = "EMAIL_VERIFY" | "EMAIL_OTP" | "PASSWORD_RESET";

export interface IToken {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  purpose: TokenPurpose;
  /**
   * SHA-256 of the raw link token. For EMAIL_OTP this is instead an HMAC keyed
   * with AUTH_SECRET: a bare digest of a six-digit space can be exhausted in
   * milliseconds, so the key is what makes hashing the code worth anything.
   */
  tokenHash: string;
  /** Wrong-code submissions. EMAIL_OTP only; the code dies once it hits the cap. */
  attempts: number;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

const TokenSchema = new Schema<IToken>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    purpose: {
      type: String,
      enum: ["EMAIL_VERIFY", "EMAIL_OTP", "PASSWORD_RESET"],
      required: true,
    },
    tokenHash: { type: String, required: true, index: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// OTP verification looks a code up by owner, not by hash (the attempts counter
// has to be found and bumped even when the submitted code is wrong).
TokenSchema.index({ user: 1, purpose: 1, usedAt: 1, createdAt: -1 });

// Auto-clean expired tokens.
TokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Token: Model<IToken> =
  (mongoose.models.Token as Model<IToken>) || mongoose.model<IToken>("Token", TokenSchema);
