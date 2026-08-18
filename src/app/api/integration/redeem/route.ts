import { fail } from "@/server/http";

export const runtime = "nodejs";

/**
 * RETIRED — this endpoint used to start a redemption and hand the member off to
 * the partner store with a signed link, debiting the points only when the store
 * called back. Between those two moments the points were still spendable, so
 * ten parallel requests passed the same balance check ten times.
 *
 * Redemption now issues a coupon from the member's own Benefits page, where the
 * balance check and the debit happen inside one transaction. The service
 * function this route called has been deleted, not disabled.
 *
 * The route itself stays only as a signpost. It answers 410 GONE so that any
 * client still pointed here — a cached page, a stale bookmark, an old build —
 * gets a message it can show a member, rather than a 404 that looks like an
 * outage. Every method answers the same way: there is nothing here to call.
 */
const GONE_MESSAGE =
  "Redemption now issues a Bhavika coupon instead of sending you to the store. Please reload this page and generate your coupon from the Benefits section.";

function gone() {
  const res = fail(GONE_MESSAGE, 410, { code: "ENDPOINT_RETIRED" });
  res.headers.set("cache-control", "no-store");
  return res;
}

export const GET = gone;
export const POST = gone;
export const PUT = gone;
export const PATCH = gone;
export const DELETE = gone;
