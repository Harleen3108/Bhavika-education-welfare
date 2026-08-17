import mongoose, { Schema, type Model, type Types } from "mongoose";
import { IntegrationStatus } from "@/lib/enums";

/**
 * Phase 2 readiness. Records an intent to redeem points on the external
 * Jai Maa Durga platform. In Phase 1 these are created in DISABLED state (the
 * "Use Benefits" entry point exists, but no points actually move) until the
 * external platform + signed server-to-server flow go live.
 */
export interface IIntegrationTransaction {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  /** Deterministic idempotency reference shared with the external platform. */
  referenceId: string;
  pointsRequested: number;
  status: IntegrationStatus;
  externalRef?: string;
  errorMessage?: string;
  meta?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const IntegrationTransactionSchema = new Schema<IIntegrationTransaction>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    referenceId: { type: String, required: true, unique: true, index: true },
    pointsRequested: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: Object.values(IntegrationStatus),
      default: IntegrationStatus.DISABLED,
      index: true,
    },
    externalRef: { type: String },
    errorMessage: { type: String },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

export const IntegrationTransaction: Model<IIntegrationTransaction> =
  (mongoose.models.IntegrationTransaction as Model<IIntegrationTransaction>) ||
  mongoose.model<IIntegrationTransaction>(
    "IntegrationTransaction",
    IntegrationTransactionSchema,
  );
