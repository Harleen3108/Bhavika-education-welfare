import mongoose, { Schema, type Model, type Types } from "mongoose";
import { UserRole, AccountStatus } from "@/lib/enums";

export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: AccountStatus;

  emailVerified: Date | null;

  // Referral
  referralCode: string; // this user's own code
  referrer: Types.ObjectId | null; // who referred THIS user
  referralCodeUsed: string | null; // raw code entered at signup (audit)

  // Profile
  phone?: string;
  city?: string;
  avatarUrl?: string;
  bio?: string;
  profileCompleted: boolean;

  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.USER,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(AccountStatus),
      default: AccountStatus.PENDING,
      index: true,
    },
    emailVerified: { type: Date, default: null },

    referralCode: { type: String, required: true, unique: true, index: true },
    referrer: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    referralCodeUsed: { type: String, default: null },

    phone: { type: String, trim: true, maxlength: 20 },
    city: { type: String, trim: true, maxlength: 80 },
    avatarUrl: { type: String, trim: true },
    bio: { type: String, trim: true, maxlength: 400 },
    profileCompleted: { type: Boolean, default: false },

    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

// Never leak the password hash through JSON serialization.
UserSchema.set("toJSON", {
  transform(_doc, ret) {
    delete (ret as unknown as Record<string, unknown>).passwordHash;
    return ret;
  },
});

export const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) || mongoose.model<IUser>("User", UserSchema);
