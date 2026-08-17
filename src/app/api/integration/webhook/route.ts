import { z } from "zod";
import { handle, ok, fail } from "@/server/http";
import { verifyWebhookSignature } from "@/server/integrations/signing";
import { confirmRedemption } from "@/server/services/integration.service";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const schema = z.object({
  referenceId: z.string().min(8),
  externalRef: z.string().optional(),
});

/**
 * Server-to-server webhook from the Jai Maa Durga platform confirming a
 * redemption. Authenticated by an HMAC signature over the raw body — never by
 * user session. Dormant in Phase 1 until the integration secret is configured.
 */
export const POST = handle(async (req) => {
  if (!env.JMD_INTEGRATION_SECRET) {
    return fail("Integration not configured.", 404, { code: "NOT_CONFIGURED" });
  }

  const signature = req.headers.get("x-jmd-signature") ?? "";
  const raw = await req.text();

  if (!signature || !verifyWebhookSignature(raw, signature)) {
    return fail("Invalid signature.", 401, { code: "BAD_SIGNATURE" });
  }

  const { referenceId, externalRef } = schema.parse(JSON.parse(raw || "{}"));
  const result = await confirmRedemption(referenceId, externalRef);
  return ok(result);
});
