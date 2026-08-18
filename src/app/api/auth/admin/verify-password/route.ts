import { handle, ok, fail, getClientIp } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { adminPasswordSchema } from "@/lib/validation/auth";
import { verifyAdminPassword } from "@/server/services/admin-auth.service";
import { RATE_LIMITS } from "@/lib/constants";
import {
  assertNotLocked,
  recordAdminAttempt,
} from "@/server/services/admin-security.service";

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
  const { email, password, ...gps } = adminPasswordSchema.parse(body);

  // Checked BEFORE any password work: a locked identity must cost an attacker
  // a rejection, not a bcrypt comparison they can still time.
  await assertNotLocked(email);

  if (!(await verifyAdminPassword(email, password))) {
    await recordAdminAttempt({
      req,
      email,
      stage: "PASSWORD",
      success: false,
      reason: "Wrong password",
      gps,
    });
    return fail("Password is wrong.", 401, { code: "BAD_PASSWORD" });
  }

  // Not logged as a success yet — the admin access code is still to come, and
  // calling this a completed sign-in would clear the lockout counter halfway.
  return ok({ success: true });
});
