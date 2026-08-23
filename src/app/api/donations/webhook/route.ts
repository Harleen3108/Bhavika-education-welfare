import { handle, ok, fail } from "@/server/http";
import { verifyWebhookSignature } from "@/server/services/razorpay.service";
import { markPaidByOrder } from "@/server/services/donation.service";

export const runtime = "nodejs";

/**
 * Razorpay webhook — the reliable settlement path.
 *
 * A browser can close before the checkout callback returns, so we also settle
 * on `payment.captured` here. Idempotent: `markPaidByOrder` no-ops if the
 * donation is already paid. The signature over the raw body is mandatory.
 */
export const POST = handle(async (req) => {
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  const raw = await req.text();
  if (!signature || !verifyWebhookSignature(raw, signature)) {
    return fail("Invalid signature.", 400, { code: "BAD_SIGNATURE" });
  }

  let event: { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string } } } };
  try {
    event = JSON.parse(raw);
  } catch {
    return fail("Invalid payload.", 400, { code: "BAD_JSON" });
  }

  if (event.event === "payment.captured") {
    const p = event.payload?.payment?.entity;
    if (p?.order_id && p?.id) await markPaidByOrder(p.order_id, p.id);
  }
  return ok({ received: true });
});
