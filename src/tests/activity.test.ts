import { describe, it, expect } from "vitest";
import { grantActivityReward } from "@/server/services/activity.service";
import { getWallet } from "@/server/services/wallet.service";
import { ActivityReward, UserActivityReward } from "@/server/models";
import { makeUser } from "./helpers";

describe("activity.grantActivityReward", () => {
  it("grants once and respects the per-user cap", async () => {
    await ActivityReward.create({
      key: "profile_completion",
      name: "Complete profile",
      points: 20,
      maxPerUser: 1,
      active: true,
    });
    const user = await makeUser();
    const userId = user._id.toString();

    const first = await grantActivityReward(userId, "profile_completion");
    const second = await grantActivityReward(userId, "profile_completion");

    expect(first.credited).toBe(true);
    expect(second.credited).toBe(false);

    const wallet = await getWallet(userId);
    expect(wallet.activity).toBe(20);
    expect(await UserActivityReward.countDocuments({ user: userId })).toBe(1);
  });

  it("does nothing for an inactive/unknown activity", async () => {
    const user = await makeUser();
    const res = await grantActivityReward(user._id.toString(), "nope");
    expect(res.credited).toBe(false);
    const wallet = await getWallet(user._id.toString());
    expect(wallet.total).toBe(0);
  });
});
