import { handle, ok, fail, getClientIp } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { adminPasswordSchema } from "@/lib/validation/auth";
import { verifyAdminPassword } from "@/server/services/admin-auth.service";
import { RATE_LIMITS } from "@/lib/constants";

export const runtime = "nodejs";

/** Step 2 of admin login — verify the admin's password. */
export const POST = handle(async (req) => {
  const ip = getClientIp(req);
  const rl = await rateLimit(
    `admin-pw:${ip}`,
    RATE_LIMITS.login.limit,
    RATE_LIMITS.login.windowSeconds,
  );
  if (!rl.success) {
    return fail("Too many attempts. Please try again later.", 429, { code: "RATE_LIMITED" });
  }

  const body = await req.json().catch(() => ({}));
  const { email, password } = adminPasswordSchema.parse(body);

  if (!(await verifyAdminPassword(email, password))) {
    return fail("Password is wrong.", 401, { code: "BAD_PASSWORD" });
  }

  return ok({ success: true });
});
