import { handle, ok } from "@/server/http";
import { verifyDonationSchema } from "@/lib/validation/donation";
import { verifyAndComplete } from "@/server/services/donation.service";

export const runtime = "nodejs";

/**
 * Confirm a payment from the Razorpay checkout callback. The signature is
 * verified server-side — the only thing that proves a real payment for this
 * order — before the donation is marked paid and the receipt is emailed.
 */
export const POST = handle(async (req) => {
  const body = await req.json().catch(() => ({}));
  const v = verifyDonationSchema.parse(body);
  const result = await verifyAndComplete({
    donationId: v.donationId,
    orderId: v.razorpay_order_id,
    paymentId: v.razorpay_payment_id,
    signature: v.razorpay_signature,
  });
  return ok(result);
});
