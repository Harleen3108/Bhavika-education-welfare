import { handle, ok, fail, getClientIp, hashIp } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { contactSchema } from "@/lib/validation/contact";
import { createContactSubmission } from "@/server/services/contact.service";
import { RATE_LIMITS } from "@/lib/constants";

export const runtime = "nodejs";

export const POST = handle(async (req) => {
  const ip = getClientIp(req);

  const rl = await rateLimit(
    `contact:${ip}`,
    RATE_LIMITS.contact.limit,
    RATE_LIMITS.contact.windowSeconds,
  );
  if (!rl.success) {
    return fail("Too many messages. Please try again later.", 429, { code: "RATE_LIMITED" });
  }

  const body = await req.json().catch(() => ({}));
  const data = contactSchema.parse(body);

  // Honeypot tripped → pretend success, drop silently.
  if (data.website) return ok({ success: true });

  await createContactSubmission(data, hashIp(ip));

  return ok({ success: true, message: "Thanks for reaching out — we'll be in touch soon." });
});
