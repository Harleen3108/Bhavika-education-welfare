import "server-only";
import { dbConnect } from "@/server/db/connect";
import { ActivityReward, UserActivityReward } from "@/server/models";
import { PointSource } from "@/lib/enums";
import { creditPoints } from "./wallet.service";

export type GrantResult = { credited: boolean; points: number; reason?: string };

/**
 * Grant an activity reward to a user, server-verified and abuse-safe:
 *  - The activity must exist and be active.
 *  - `maxPerUser` caps how many times a user can earn it.
 *  - `UserActivityReward` has a unique index on (user, activityKey, grantKey),
 *    so a replayed API call cannot farm points.
 *  - The wallet credit is idempotency-keyed, so even a partial retry is safe.
 *
 * @param grantKey Distinguishes repeatable grants (e.g. "event-2026-01").
 *                 Defaults to the activityKey for one-time rewards.
 */
export async function grantActivityReward(
  userId: string,
  activityKey: string,
  grantKey?: string,
): Promise<GrantResult> {
  await dbConnect();

  const activity = await ActivityReward.findOne({ key: activityKey, active: true }).lean();
  if (!activity) return { credited: false, points: 0, reason: "INACTIVE" };

  const grant = grantKey ?? activityKey;

  // Enforce per-user cap (0 = unlimited).
  const already = await UserActivityReward.findOne({ user: userId, activityKey, grantKey: grant });
  if (!already && activity.maxPerUser > 0) {
    const count = await UserActivityReward.countDocuments({ user: userId, activityKey });
    if (count >= activity.maxPerUser) {
      return { credited: false, points: 0, reason: "CAP_REACHED" };
    }
  }

  // Record the grant (unique index guards against races/replays).
  if (!already) {
    try {
      await UserActivityReward.create({
        user: userId,
        activityKey,
        grantKey: grant,
        points: activity.points,
      });
    } catch (err) {
      if ((err as { code?: number })?.code !== 11000) throw err;
      // Duplicate → another request recorded it; fall through to (idempotent) credit.
    }
  }

  const res = await creditPoints({
    userId,
    source: PointSource.ACTIVITY,
    points: activity.points,
    referenceType: "ActivityReward",
    description: `Activity: ${activity.name}`,
    idempotencyKey: `activity:${userId}:${activityKey}:${grant}`,
  });

  return { credited: res.credited, points: activity.points };
}
