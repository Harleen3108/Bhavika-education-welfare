import { handle, ok, fail, getClientIp } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { requestPasswordReset } from "@/server/services/auth.service";
import { RATE_LIMITS } from "@/lib/constants";

export const runtime = "nodejs";

export const POST = handle(async (req) => {
  const ip = getClientIp(req);
  const rl = await rateLimit(
    `forgot:${ip}`,
    RATE_LIMITS.forgotPassword.limit,
    RATE_LIMITS.forgotPassword.windowSeconds,
  );
  if (!rl.success) {
    return fail("Too many requests. Please try again later.", 429, { code: "RATE_LIMITED" });
  }

  const body = await req.json().catch(() => ({}));
  const { email } = forgotPasswordSchema.parse(body);

  await requestPasswordReset(email);

  // Always success — never reveal whether the email exists.
  return ok({
    success: true,
    message: "If an account exists for that email, a reset link has been sent.",
  });
});
