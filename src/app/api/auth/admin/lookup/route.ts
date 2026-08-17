import { handle, ok, fail, getClientIp } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { adminLookupSchema } from "@/lib/validation/auth";
import { isAdminEmail } from "@/server/services/admin-auth.service";
import { RATE_LIMITS } from "@/lib/constants";

export const runtime = "nodejs";

/** Step 1 of admin login — confirm the email belongs to an admin account. */
export const POST = handle(async (req) => {
  const ip = getClientIp(req);
  const rl = await rateLimit(
    `admin-lookup:${ip}`,
    RATE_LIMITS.login.limit,
    RATE_LIMITS.login.windowSeconds,
  );
  if (!rl.success) {
    return fail("Too many attempts. Please try again later.", 429, { code: "RATE_LIMITED" });
  }

  const body = await req.json().catch(() => ({}));
  const { email } = adminLookupSchema.parse(body);

  if (!(await isAdminEmail(email))) {
    return fail("This ID is not recognised as an admin.", 404, { code: "NOT_ADMIN" });
  }

  return ok({ success: true });
});
