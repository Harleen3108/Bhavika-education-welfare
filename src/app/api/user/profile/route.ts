import { handle, ok } from "@/server/http";
import { requireUser } from "@/server/auth/session";
import { profileSchema } from "@/lib/validation/profile";
import { getProfile, updateProfile } from "@/server/services/user.service";
import { grantActivityReward } from "@/server/services/activity.service";

export const runtime = "nodejs";

export const GET = handle(async () => {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  return ok({ profile });
});

export const PATCH = handle(async (req) => {
  const user = await requireUser();
  const body = await req.json().catch(() => ({}));
  const data = profileSchema.parse(body);
  const { profile, newlyCompleted } = await updateProfile(user.id, data);

  // One-time profile-completion reward — idempotent & capped server-side.
  let awardedPoints = 0;
  if (newlyCompleted) {
    const grant = await grantActivityReward(user.id, "profile_completion");
    if (grant.credited) awardedPoints = grant.points;
  }

  return ok({ profile, newlyCompleted, awardedPoints });
});
