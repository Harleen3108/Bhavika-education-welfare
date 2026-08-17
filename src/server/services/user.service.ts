import "server-only";
import type { Types } from "mongoose";
import { dbConnect } from "@/server/db/connect";
import { User } from "@/server/models";
import { DomainError } from "@/server/errors";
import type { ProfileInput } from "@/lib/validation/profile";

export type ProfileDTO = {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  bio: string;
  avatarUrl: string;
  referralCode: string;
  status: string;
  emailVerified: boolean;
  profileCompleted: boolean;
  createdAt: string;
};

function isComplete(u: { name?: string; phone?: string; city?: string }): boolean {
  return Boolean(u.name && u.phone && u.city);
}

export async function getProfile(userId: string): Promise<ProfileDTO> {
  await dbConnect();
  const u = await User.findById(userId).lean();
  if (!u) throw new DomainError("User not found.", 404, "NOT_FOUND");
  return {
    id: u._id.toString(),
    name: u.name,
    email: u.email,
    phone: u.phone ?? "",
    city: u.city ?? "",
    bio: u.bio ?? "",
    avatarUrl: u.avatarUrl ?? "",
    referralCode: u.referralCode,
    status: u.status,
    emailVerified: Boolean(u.emailVerified),
    profileCompleted: u.profileCompleted,
    createdAt: u.createdAt.toISOString(),
  };
}

/**
 * Update the user's own profile. Recomputes `profileCompleted`. Returns whether
 * the profile transitioned to complete for the first time, so the caller can
 * award the one-time profile-completion activity reward (Phase 1F/1G).
 */
export async function updateProfile(
  userId: string,
  input: ProfileInput,
): Promise<{ profile: ProfileDTO; newlyCompleted: boolean }> {
  await dbConnect();
  const existing = await User.findById(userId).select("profileCompleted");
  if (!existing) throw new DomainError("User not found.", 404, "NOT_FOUND");
  const wasComplete = existing.profileCompleted;

  const completed = isComplete(input);
  await User.updateOne(
    { _id: userId },
    {
      $set: {
        name: input.name,
        phone: input.phone || undefined,
        city: input.city || undefined,
        bio: input.bio || undefined,
        avatarUrl: input.avatarUrl || undefined,
        profileCompleted: completed,
      },
    },
  );

  const profile = await getProfile(userId);
  return { profile, newlyCompleted: completed && !wasComplete };
}

/** Lightweight header/summary info for dashboard chrome. */
export async function getUserSummary(userId: string): Promise<{
  name: string;
  email: string;
  avatarUrl: string;
  referralCode: string;
} | null> {
  await dbConnect();
  const u = await User.findById(userId).select("name email avatarUrl referralCode").lean();
  if (!u) return null;
  return {
    name: u.name,
    email: u.email,
    avatarUrl: u.avatarUrl ?? "",
    referralCode: u.referralCode,
  };
}

export type { Types };
