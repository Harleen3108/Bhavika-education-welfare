import mongoose, { Schema, type Model, type Types } from "mongoose";

/**
 * One-time tokens for email verification and password reset.
 * Only a SHA-256 hash of the token is stored — the raw token lives only in the
 * emailed link. TTL index auto-expires documents at `expiresAt`.
 */
export type TokenPurpose = "EMAIL_VERIFY" | "PASSWORD_RESET";

export interface IToken {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  purpose: TokenPurpose;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

const TokenSchema = new Schema<IToken>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    purpose: {
      type: String,
      enum: ["EMAIL_VERIFY", "PASSWORD_RESET"],
      required: true,
    },
    tokenHash: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Auto-clean expired tokens.
TokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Token: Model<IToken> =
  (mongoose.models.Token as Model<IToken>) || mongoose.model<IToken>("Token", TokenSchema);
