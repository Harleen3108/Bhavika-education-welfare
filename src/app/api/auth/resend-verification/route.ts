import { handle, ok, fail, getClientIp } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { resendVerificationSchema } from "@/lib/validation/auth";
import { resendVerification } from "@/server/services/auth.service";
import { RATE_LIMITS } from "@/lib/constants";

export const runtime = "nodejs";

export const POST = handle(async (req) => {
  const ip = getClientIp(req);
  const rl = await rateLimit(
    `resend:${ip}`,
    RATE_LIMITS.forgotPassword.limit,
    RATE_LIMITS.forgotPassword.windowSeconds,
  );
  if (!rl.success) {
    return fail("Too many requests. Please try again later.", 429, { code: "RATE_LIMITED" });
  }

  const body = await req.json().catch(() => ({}));
  const { email } = resendVerificationSchema.parse(body);

  await resendVerification(email);

  return ok({
    success: true,
    message: "If your account needs verification, a new link has been sent.",
  });
});
