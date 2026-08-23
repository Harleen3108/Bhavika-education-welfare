import { handle, ok } from "@/server/http";
import { getSessionUser } from "@/server/auth/session";
import { donateSchema } from "@/lib/validation/donation";
import { createDonation } from "@/server/services/donation.service";

export const runtime = "nodejs";

/**
 * Start a donation. Login is optional — a guest's email is captured so the
 * donation attaches to their account if they ever sign up with it. Returns the
 * Razorpay order the browser checkout needs.
 */
export const POST = handle(async (req) => {
  const user = await getSessionUser();
  const body = await req.json().catch(() => ({}));
  const input = donateSchema.parse(body);
  const result = await createDonation(input, user?.id ?? null);
  return ok(result, { status: 201 });
});
