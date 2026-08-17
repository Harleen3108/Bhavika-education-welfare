import { handle, ok, fail, getClientIp } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { verifyOtpSchema } from "@/lib/validation/auth";
import { verifyOtp } from "@/server/services/otp.service";
import { RATE_LIMITS } from "@/lib/constants";

export const runtime = "nodejs";

export const POST = handle(async (req) => {
  const ip = getClientIp(req);
  // Per-code attempts are already capped in the OTP itself; this only stops one
  // host from grinding through many accounts.
  const rl = await rateLimit(`verify-otp:${ip}`, RATE_LIMITS.login.limit, RATE_LIMITS.login.windowSeconds);
  if (!rl.success) {
    return fail("Too many attempts. Please try again later.", 429, { code: "RATE_LIMITED" });
  }

  const body = await req.json().catch(() => ({}));
  const { email, code } = verifyOtpSchema.parse(body);

  await verifyOtp(email, code);

  return ok({ ok: true });
});
