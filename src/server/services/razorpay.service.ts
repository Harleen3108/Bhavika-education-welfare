import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { env, razorpayConfigured } from "@/lib/env";
import { DomainError } from "@/server/errors";

export { razorpayConfigured };

/**
 * Razorpay via its REST API — no SDK dependency. `key_id` is public (it goes to
 * the browser checkout); the secret never leaves the server and is used only to
 * create orders and to verify the signature Razorpay returns.
 */

type RazorpayOrder = { id: string; amount: number; currency: string; status: string };

export async function createRazorpayOrder(input: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  if (!razorpayConfigured) {
    throw new DomainError("Online donations aren't configured yet.", 503, "NOT_CONFIGURED");
  }
  const auth = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Basic ${auth}` },
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: "INR",
      receipt: input.receipt,
      notes: input.notes ?? {},
      payment_capture: 1,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[razorpay] order create failed:", res.status, detail);
    throw new DomainError("We couldn't start the payment. Please try again.", 502, "ORDER_FAILED");
  }
  return (await res.json()) as RazorpayOrder;
}

/** Constant-time compare of two hex digests of equal length. */
function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

/**
 * Verify the checkout callback signature: HMAC-SHA256(`order_id|payment_id`)
 * keyed by the secret must equal `razorpay_signature`. This is what proves a
 * payment actually happened and was for THIS order — never trust the client's
 * word for it.
 */
export function verifyPaymentSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  if (!env.RAZORPAY_KEY_SECRET) return false;
  const expected = createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest("hex");
  return safeEqualHex(expected, input.signature);
}

/** Verify a Razorpay webhook body against `X-Razorpay-Signature`. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!env.RAZORPAY_WEBHOOK_SECRET) return false;
  const expected = createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}

export const razorpayKeyId = env.RAZORPAY_KEY_ID ?? "";
