import { handle, ok } from "@/server/http";
import { requireUser } from "@/server/auth/session";
import { getReferralOverview } from "@/server/services/referral.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const user = await requireUser();
  return ok(await getReferralOverview(user.id));
});
