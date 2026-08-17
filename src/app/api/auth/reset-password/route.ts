import { handle, ok, fail, getClientIp } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { resetPasswordSchema } from "@/lib/validation/auth";
import { resetPassword } from "@/server/services/auth.service";
import { RATE_LIMITS } from "@/lib/constants";

export const runtime = "nodejs";

export const POST = handle(async (req) => {
  const ip = getClientIp(req);
  const rl = await rateLimit(
    `reset:${ip}`,
    RATE_LIMITS.forgotPassword.limit,
    RATE_LIMITS.forgotPassword.windowSeconds,
  );
  if (!rl.success) {
    return fail("Too many requests. Please try again later.", 429, { code: "RATE_LIMITED" });
  }

  const body = await req.json().catch(() => ({}));
  const { token, password } = resetPasswordSchema.parse(body);

  await resetPassword(token, password);

  return ok({ success: true, message: "Your password has been reset. You can now log in." });
});
