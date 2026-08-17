import { handle, ok, fail, getClientIp } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { registerSchema } from "@/lib/validation/auth";
import { registerUser } from "@/server/services/auth.service";
import { RATE_LIMITS } from "@/lib/constants";

export const runtime = "nodejs";

export const POST = handle(async (req) => {
  const ip = getClientIp(req);
  const rl = await rateLimit(
    `register:${ip}`,
    RATE_LIMITS.register.limit,
    RATE_LIMITS.register.windowSeconds,
  );
  if (!rl.success) {
    return fail("Too many attempts. Please try again later.", 429, { code: "RATE_LIMITED" });
  }

  const body = await req.json().catch(() => ({}));
  const data = registerSchema.parse(body);

  const { email, resent } = await registerUser(data);

  // `resent` is only present when an unverified account was re-issued a code,
  // so the UI can say "we sent it again" instead of "welcome".
  return ok({
    ok: true,
    email,
    needsVerification: true,
    ...(resent ? { resent: true } : {}),
  });
});
