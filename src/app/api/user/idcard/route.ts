import { handle, ok } from "@/server/http";
import { requireUser } from "@/server/auth/session";
import { idCardSubmitSchema } from "@/lib/validation/idcard";
import { submitCard, getMyCard } from "@/server/services/idcard.service";

export const runtime = "nodejs";

/** The member's own card request/state. */
export const GET = handle(async () => {
  const user = await requireUser();
  return ok({ card: await getMyCard(user.id) });
});

/**
 * Submit or resubmit KYC for an ID card. The photo is the member's profile
 * avatar (uploaded separately via /api/user/avatar), so it is not in this body.
 */
export const POST = handle(async (req) => {
  const user = await requireUser();
  const body = await req.json().catch(() => ({}));
  const input = idCardSubmitSchema.parse(body);
  const card = await submitCard(user.id, input);
  return ok({ card }, { status: 201 });
});
