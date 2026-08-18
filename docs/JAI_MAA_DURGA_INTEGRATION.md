# Bhavika ↔ Jai Maa Durga — Coupon Integration

**Audience:** the developer building the Jai Maa Durga store. You do not need to know
anything about the Bhavika codebase to implement this.

**Status:** this document is the contract. The store is being built against it. If
something here is ambiguous, ask before you guess — every ambiguity in a document like
this becomes a money bug in one of the two codebases.

---

## 1. What you are integrating with

Members of the Bhavika Education & Welfare Foundation platform earn **points** by taking
daily quizzes, inviting friends and completing their profile. Once a member has enough
points they convert them into a **Bhavika coupon** — a code worth a fixed number of
rupees, which they spend at Jai Maa Durga.

Two facts shape everything below.

**The points are already gone.** They are debited from the member's wallet at the moment
the coupon is created, inside a single database transaction with the coupon insert. By
the time a code reaches your till, Bhavika has already been paid. Your store is not
drawing down a balance; it is accepting a voucher that has been paid for.

**A coupon is a bearer instrument.** Whoever holds the code can spend it, exactly like a
paper voucher. There is no member login at your end, no identity check, and this API will
never tell you who the coupon belongs to. Treat a code as you would treat cash.

You will call two endpoints: one to **check** a code, one to **spend** it.

---

## 2. The flow, end to end

```
  Member                Bhavika                    Jai Maa Durga store
    |                      |                                |
    |  "convert 5,000 pts" |                                |
    |--------------------->|                                |
    |                      | debit 5,000 pts  +  create     |
    |                      | coupon BHAV-7K2X-9QM4-P8RT     |
    |                      | worth Rs 500, valid 90 days    |
    |  code shown / saved  | (one atomic transaction)       |
    |<---------------------|                                |
    |                                                       |
    |  reads the code out at the counter                    |
    |------------------------------------------------------>|
    |                                                       |
    |                      |  POST /coupons/validate        |
    |                      |<-------------------------------|
    |                      |  valid, Rs 500                 |
    |                      |------------------------------->|
    |                                                       | shopkeeper
    |                                                       | applies Rs 500
    |                                                       | and takes payment
    |                      |  POST /coupons/redeem          |
    |                      |  + your order reference        |
    |                      |<-------------------------------|
    |                      |  redeemed (exactly once)       |
    |                      |------------------------------->|
```

**Order of operations at your till:**

1. Shopper gives a code. Normalise and format-check it locally (§4) so typos never
   become API calls.
2. `POST /api/integration/coupons/validate` — read-only, safe to call as often as you
   like. Shows the shopkeeper the rupee value before anything is committed.
3. Complete the sale in your own system and get your order reference.
4. `POST /api/integration/coupons/redeem` with that order reference. **This call is
   authoritative.** Only a `200` here means the coupon was actually spent.

> **Validate is advisory, redeem is the truth.** Between your validate and your redeem,
> another till — or the same family at another counter — could spend the coupon. Never
> hand over goods on the strength of a validate response alone. If redeem fails after
> you have already discounted the basket, reverse the discount and ask for payment.

---

## 3. Environment and secrets

Bhavika will give you two values. Nothing flows the other way — you do not issue us
credentials.

| You need | Example | Notes |
|---|---|---|
| Base URL | `https://bhavika-education-welfare.vercel.app` | Staging URL supplied separately. |
| Shared secret | 64 hex characters | Set in Bhavika's `JMD_INTEGRATION_SECRET`. Store it in your server environment only. |

On your side:

```dotenv
BHAVIKA_API_BASE=https://bhavika-education-welfare.vercel.app
BHAVIKA_INTEGRATION_SECRET=<the 64-character secret we send you out of band>
```

Rules for the secret:

- **Server-side only.** It must never reach a browser, a mobile app bundle, or a
  JavaScript till running on a shop counter. Anyone holding it can spend any coupon they
  can guess. If your till is a browser, it must call *your own* backend, and your backend
  calls us.
- At least 32 random bytes (64 hex chars). We will send it over a channel that is not
  email.
- **Rotation is a coordinated cutover, not an overlap.** Exactly one secret is live at a
  time, so the change takes effect the moment we deploy it and any request signed with
  the old one fails immediately. Agree a low-traffic window with us in advance and switch
  both sides together. Never rotate unilaterally.

Until Bhavika sets `JMD_INTEGRATION_SECRET`, both endpoints answer
`503 NOT_CONFIGURED` — deliberately, so that an unconfigured environment can never fall
back to some other key and start honouring coupons.

> `JMD_INTEGRATION_URL` still exists in Bhavika's environment. It is vestigial — a
> leftover from the retired redirect flow (§10) — and has no part in this contract.

---

## 4. The coupon code format

```
BHAV-XXXX-XXXX-XXXX          e.g.  BHAV-7K2X-9QM4-P8RT
```

- Fixed prefix `BHAV`, then **three** groups of four characters, dash-separated.
- Alphabet: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` — 32 symbols. There is no `O`, `0`, `I` or
  `1`, so a code read down a phone line has no confusable characters and you never need
  to substitute glyphs when cleaning input.
- Total: 12 random characters ≈ 1.15 × 10¹⁸ possible codes.

Regex for a fully normalised code:

```
^BHAV(?:-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}){3}$
```

**Normalise before you send.** Bhavika applies exactly this normalisation to whatever
you post, and always echoes the canonical form back:

```js
function normalise(input) {
  const compact = input.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const body = compact.startsWith('BHAV') && compact.length === 16 ? compact.slice(4) : compact
  // Group the WHOLE body, never just the first 12 characters. Truncating would
  // turn over-long input — a scanner emitting a trailing character, a shopper
  // reading out one group too many — into a well-formed-looking code that we
  // then reject, so your check would pass and ours would 422.
  const groups = []
  for (let i = 0; i < body.length; i += 4) groups.push(body.slice(i, i + 4))
  return ['BHAV', ...groups].join('-')
}
```

So `bhav 7k2x 9qm4 p8rt`, `BHAV7K2X9QM4P8RT` and `7k2x-9qm4-p8rt` all resolve to the same
coupon. Anything that does not match the regex after normalisation is rejected with
`422 VALIDATION` before any database lookup, so it never draws the unknown-code penalty —
it still spends the ordinary 1 unit of your rate-limit bucket (§9). Check the regex
client-side and you will never see a 422.

---

## 5. Authentication — signing a request

Every request to both endpoints carries two headers.

| Header | Value |
|---|---|
| `x-jmd-timestamp` | Current Unix time in **whole seconds**, as a decimal string. No milliseconds, no leading zeros, no fractional part. |
| `x-jmd-signature` | `base64url( HMAC-SHA256( secret, "<x-jmd-timestamp>.<raw request body>" ) )` |

Also send `Content-Type: application/json`.

### 5.1 The signing base string

```
<timestamp> + "." + <the exact body bytes you are about to send>
```

Three traps, all of which have caused outages in integrations like this one:

1. **Sign the exact bytes you send.** Serialise your JSON once, into a string; sign that
   string; send that string. Do not build the signature from one serialisation and the
   body from another. Key order, whitespace and Unicode escaping all change the bytes and
   therefore the signature.
2. **`base64url`, not base64.** RFC 4648 §5: `+` → `-`, `/` → `_`, and **no `=`
   padding**. Most languages give you standard base64 by default. Convert.
3. **Use the timestamp string, not the number.** Sign the same characters you put in the
   header. `1767225600` and `01767225600` are the same integer but different bytes, and
   we sign bytes.

### 5.2 Worked example

Verify your signing routine against this before you send anything real. These are fixed
test values — the timestamp is deliberately in the past, so a live call using it will
correctly be rejected as stale.

```
secret     : jmd_test_secret_do_not_use_in_production
timestamp  : 1767225600                                  (2026-01-01T00:00:00Z)
body       : {"code":"BHAV-7K2X-9QM4-P8RT"}
base string: 1767225600.{"code":"BHAV-7K2X-9QM4-P8RT"}

x-jmd-signature: aLn9DjVNP8kFhaRIA5U00nHbkngzDYZ3OuerHxjTjIM
```

And for a redeem body:

```
body       : {"code":"BHAV-7K2X-9QM4-P8RT","externalRef":"JMD-2026-000481"}
base string: 1767225600.{"code":"BHAV-7K2X-9QM4-P8RT","externalRef":"JMD-2026-000481"}

x-jmd-signature: b0Ho91UecJC6w3BfTMzFGadapA0VNGJcbKTAGRCTFTw
```

If your code produces those two strings, your signing is correct.

### 5.3 Reference implementations

**Node.js**

```js
import { createHmac } from 'node:crypto'

async function callBhavika(path, payload) {
  const body = JSON.stringify(payload)            // serialise ONCE
  const timestamp = String(Math.floor(Date.now() / 1000))
  const signature = createHmac('sha256', process.env.BHAVIKA_INTEGRATION_SECRET)
    .update(`${timestamp}.${body}`)
    .digest('base64url')                          // base64url, not base64

  const res = await fetch(`${process.env.BHAVIKA_API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-jmd-timestamp': timestamp,
      'x-jmd-signature': signature,
    },
    body,                                         // the SAME string that was signed
  })
  return { status: res.status, json: await res.json() }
}
```

**PHP**

```php
function call_bhavika(string $path, array $payload): array {
    $body      = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    $timestamp = (string) time();
    $raw       = hash_hmac('sha256', $timestamp . '.' . $body, getenv('BHAVIKA_INTEGRATION_SECRET'), true);
    $signature = rtrim(strtr(base64_encode($raw), '+/', '-_'), '=');   // base64url

    $ch = curl_init(getenv('BHAVIKA_API_BASE') . $path);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $body,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'x-jmd-timestamp: ' . $timestamp,
            'x-jmd-signature: ' . $signature,
        ],
    ]);
    $out    = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['status' => $status, 'json' => json_decode($out, true)];
}
```

### 5.4 Timestamp, staleness and replay

- The timestamp must be within **±300 seconds (5 minutes)** of Bhavika's clock. Outside
  that window: `401 STALE_REQUEST`. Future timestamps are rejected on the same rule — you
  cannot buy yourself a longer window by dating a request forward.
- **Run NTP on your servers.** Clock drift is the single most common cause of a working
  integration suddenly returning 401s. If you start seeing `STALE_REQUEST`, compare your
  clock with the `checkedAt` field the validate endpoint returns before you suspect
  anything else.
- Sign **every** request individually, including retries. A retry sent 6 minutes later
  with the original timestamp is stale; recompute the timestamp and the signature.
- **Replay:** the 5-minute window bounds how long a captured request is usable at all. A
  captured *validate* changes nothing. A captured *redeem* is harmless because redeem is
  idempotent on your order reference (§7.2) — replaying it re-returns the original
  outcome and spends nothing extra. That is why there is no nonce to track.

---

## 6. `POST /api/integration/coupons/validate`

Read-only. Changes nothing. Safe to call repeatedly — on every keystroke of a code field,
on a page refresh, on a basket recalculation.

It is a POST despite being read-only for two reasons: the code is money and must not sit
in a request line where it lands in access logs, browser history and proxy caches; and
signing needs a body.

### Request

```json
{ "code": "BHAV-7K2X-9QM4-P8RT" }
```

| Field | Type | Rules |
|---|---|---|
| `code` | string | Required. 1–64 chars. Normalised server-side (§4). |

### Response — always `200` for a well-formed, authenticated request

Usable coupon:

```json
{
  "valid": true,
  "code": "BHAV-7K2X-9QM4-P8RT",
  "status": "ACTIVE",
  "reason": null,
  "valueRupees": 500,
  "currency": "INR",
  "expiresAt": "2026-11-16T09:12:44.000Z",
  "checkedAt": "2026-08-18T09:12:44.000Z"
}
```

Anything else — unknown code, already spent, lapsed:

```json
{
  "valid": false,
  "code": "BHAV-7K2X-9QM4-P8RT",
  "status": "INVALID",
  "reason": "INVALID",
  "valueRupees": 0,
  "currency": "INR",
  "expiresAt": null,
  "checkedAt": "2026-08-18T09:12:44.000Z"
}
```

| Field | Type | Meaning |
|---|---|---|
| `valid` | boolean | **The only field your logic should branch on.** |
| `code` | string | The canonical form of what you sent. Echo it back to the shopkeeper so a mistyped group is visible. |
| `status` | `"ACTIVE"` \| `"INVALID"` | `ACTIVE` when `valid` is true; `INVALID` otherwise. |
| `reason` | `"INVALID"` \| `null` | `null` when valid. |
| `valueRupees` | integer | Whole rupees to discount. `0` when not valid. Never a fraction. |
| `currency` | `"INR"` | Always. Present so no one has to assume. |
| `expiresAt` | ISO 8601 UTC \| `null` | Informational — you may warn "expires in 3 days". |
| `checkedAt` | ISO 8601 UTC | Bhavika's clock at the moment of the check. Use it to detect your own drift. |

### Why an invalid answer is not itemised

A wrong code, a coupon spent last week and a coupon that lapsed yesterday produce a
**byte-identical** response: same HTTP status, same keys, same values. This is
deliberate, and it is the main anti-enumeration control on this API.

"That code was real, it has just been used" is the single most valuable thing an attacker
mining codes could be told — it converts a blind guess into a confirmed hit and tells
them their generator is aimed correctly. Your till does not need the distinction to
refuse a coupon; it refuses either way.

Where the difference genuinely matters, it is available:

- At **redeem** time (§7), where a real transaction is in progress and a shopkeeper has
  to explain something to a family, the precise reason is returned.
- On the **member's own Bhavika dashboard**, where every coupon they hold is listed with
  its exact status and expiry.

So when validate says `valid: false`, tell the shopper what §8 says: the coupon cannot be
used here, and their Bhavika dashboard will say why.

---

## 7. `POST /api/integration/coupons/redeem`

Spends the coupon. Authoritative. Call it once per coupon per order, after the sale is
committed on your side.

### Request

```json
{
  "code": "BHAV-7K2X-9QM4-P8RT",
  "externalRef": "JMD-2026-000481"
}
```

| Field | Type | Rules |
|---|---|---|
| `code` | string | Required. As above. |
| `externalRef` | string | Required. 1–120 chars, trimmed. **Your order id.** |

`externalRef` is stored against the coupon permanently. It is the only thread back from a
spent coupon to the purchase it paid for, and it is what a dispute six weeks later has to
go on. Send your real order id — not a UUID you generate per attempt, not a timestamp,
not `"pos-terminal-3"`. If it is not stable across your own retries, idempotency will not
work (see below).

### Success — `200`

```json
{
  "redeemed": true,
  "replay": false,
  "code": "BHAV-7K2X-9QM4-P8RT",
  "valueRupees": 500,
  "currency": "INR",
  "externalRef": "JMD-2026-000481",
  "redeemedAt": "2026-08-18T09:14:02.000Z"
}
```

| Field | Meaning |
|---|---|
| `redeemed` | Always `true` on a 200. |
| `replay` | `false` — this call performed the redemption. `true` — the coupon was already spent against **this same** `externalRef`, so this request was a retry of one that had already succeeded. Log it; change nothing. |
| `valueRupees` | The amount to discount. Trust this over anything cached from validate. |
| `redeemedAt` | When the coupon was actually spent — on a replay, the ORIGINAL time, not now. |

### 7.1 Exactly-once, under concurrency

Redemption is a single conditional database update that requires the coupon to be
`ACTIVE` and unexpired. Two requests arriving at the same instant for the same code
cannot both match it.

- Same code, **different** `externalRef`, concurrent → exactly one `200`, the other
  `409 ALREADY_REDEEMED`. One order gets the discount.
- Same code, **same** `externalRef`, concurrent → both `200` (one with `replay: true`),
  and exactly one redemption happened. They are the same logical operation.

### 7.2 Idempotency — what you can retry

If you do not get a response — connection reset, timeout, gateway 502, your process
died — **retry with the identical `code` and `externalRef`** (and a fresh timestamp and
signature). One of two things is true, and both end well:

- The first request never landed → the retry redeems normally, `replay: false`.
- The first request landed and you lost the answer → the retry returns `200` with
  `replay: true` and the original `redeemedAt`.

You will not get a `409` for your own retry, and the coupon is never spent twice.

**This only holds if `externalRef` is stable.** A retry that invents a new order
reference is, as far as Bhavika can tell, a second order reaching for a spent coupon, and
gets `409 ALREADY_REDEEMED`. Generate the order reference before the first attempt and
reuse it.

Suggested retry policy: up to 3 attempts, 1s / 3s backoff, then flag the order for manual
reconciliation. Do not retry `4xx` other than `429` — a `404`, `409` or `410` will not
change on a retry.

### 7.3 Rules the contract does NOT bend on

- **All or nothing.** A coupon is consumed in full. There is no partial redemption, no
  remaining balance, no change given. If the basket is worth less than the coupon, the
  difference is lost to the shopper — **warn them before you redeem**, and let them add
  to the basket or come back another day.
- **You may apply more than one coupon to an order.** Call redeem once per code; the same
  `externalRef` on each is correct and expected.
- **Redemption stays open even when issuing is paused.** Bhavika can switch off the
  creation of new coupons at any time. That never affects coupons already in members'
  hands — those points are already spent, and stranding them would be a confiscation.
  This endpoint keeps working.

---

## 8. What to show the shopper

Bhavika's members are largely families in small towns and villages, many reading Hindi
more comfortably than English. Please show both.

| Situation | English | Hindi |
|---|---|---|
| `valid: true` | "Bhavika coupon applied — ₹500 off." | "भाविका कूपन लगा — ₹500 की छूट।" |
| `valid: false` (validate) | "This coupon can't be used here. Please check the code — or open your Bhavika dashboard, it shows the status of every coupon you have." | "यह कूपन यहाँ इस्तेमाल नहीं हो सकता। कोड दोबारा जाँच लें — या अपना भाविका डैशबोर्ड खोलें, वहाँ हर कूपन की स्थिति दिखती है।" |
| `404 NOT_FOUND` (redeem) | "No such coupon code. Please check each group of four characters." | "ऐसा कोई कूपन कोड नहीं है। चार-चार अक्षरों के हर हिस्से को दोबारा जाँच लें।" |
| `409 ALREADY_REDEEMED` | "This coupon has already been used." | "यह कूपन पहले ही इस्तेमाल हो चुका है।" |
| `410 EXPIRED` | "This coupon has expired and can no longer be used." | "इस कूपन की अवधि समाप्त हो चुकी है।" |
| `429`, `503`, `5xx` | "We can't reach Bhavika right now. Please try again in a moment." | "अभी भाविका से संपर्क नहीं हो पा रहा। कृपया थोड़ी देर बाद कोशिश करें।" |

Two things not to do:

- **Do not tell the shopper the coupon "expired" when you got a 409, or "was used" when
  you got a 410.** A family told the wrong reason goes away trying to fix the wrong
  thing.
- **Do not say "invalid code" for a 429 or a 503.** That is our problem, not theirs, and
  a shopper who believes their coupon is dead may not come back.

One more, on expiry: a Bhavika coupon that lapses unused is **forfeited — the points are
not returned.** Members are warned of this before they generate one. If a shopper is
holding a coupon that expires soon, telling them so is a genuine kindness.

---

## 9. Rate limits and abuse controls

Buckets are per calling IP address, fixed window.

| Endpoint | Limit |
|---|---|
| `/coupons/validate` | 60 requests / 60 s |
| `/coupons/redeem` | 20 requests / 60 s |

Over the limit: `429 RATE_LIMITED` with a `Retry-After` header in seconds. Back off; do
not hammer.

**The unknown-code penalty.** A request whose code matches no coupon at all costs **4
units** of your bucket instead of 1. A code that is real but spent or lapsed costs the
normal 1 — a till re-reading a real coupon is ordinary behaviour, not an attack. A code
that fails the format regex is rejected before any lookup and costs 1.

The effect for a real store is nothing: your tills check real coupons. The effect for
someone guessing codes is that they get roughly 15 guesses a minute against 1.15 × 10¹⁸
possibilities, and when the bucket empties, **every** request from that address is
refused — including one carrying a genuine code. There is no "429 means wrong, 200 means
right" signal to read.

So: **validate the format locally before you call us.** It costs you nothing and keeps
your bucket for real work.

We deliberately do **not** return `X-RateLimit-Remaining`. The remaining count moves by 1
on a hit and by 4 on a miss, so publishing it would rebuild exactly the oracle the
uniform validate response removes.

Tell us your **egress IP addresses** before go-live. If your store scales out behind many
addresses, tell us that too — each address gets its own bucket, which we need to know
about, and we would rather allowlist you than discover it as anomalous traffic.

---

## 10. Errors — the complete list

Every error response has this shape:

```json
{ "error": "Human-readable sentence.", "code": "MACHINE_CODE" }
```

`422` responses additionally carry `fields`, mapping the offending field to its message.
**Branch on `code`, never on the `error` text** — the wording may be improved at any time.

### Applies to both endpoints

| HTTP | `code` | Cause | What to do |
|---|---|---|---|
| 401 | `MISSING_SIGNATURE` | `x-jmd-signature` or `x-jmd-timestamp` header absent or empty. | Fix your client. Not retryable. |
| 401 | `BAD_TIMESTAMP` | Timestamp is not whole Unix seconds. | Fix your client. `"1767225600"`, not `"1767225600.5"` or an ISO date. |
| 401 | `STALE_REQUEST` | Timestamp more than 300 s from our clock, either direction. | Check NTP. Recompute timestamp + signature and retry once. |
| 401 | `BAD_SIGNATURE` | HMAC does not match. | Almost always: standard base64 instead of base64url, or the signed string differing from the sent body. Re-run the §5.2 worked example. Not retryable. |
| 400 | `BAD_JSON` | Body is not valid JSON. | Fix your client. |
| 413 | `PAYLOAD_TOO_LARGE` | Body over 2048 bytes. | You are not sending a coupon call. |
| 422 | `VALIDATION` | Body parsed but failed the schema — e.g. a code that does not match the format, a missing or over-long `externalRef`. See `fields`. | Fix the input. Not retryable. |
| 429 | `RATE_LIMITED` | Bucket exhausted (§9). | Honour `Retry-After`. |
| 503 | `NOT_CONFIGURED` | Bhavika has no integration secret set in this environment. | Not your bug — tell us. |
| 500 | `INTERNAL` | Unexpected fault our end. | Retry with backoff; if it persists, tell us. |

A `422` example:

```json
{
  "error": "Please correct the highlighted fields.",
  "code": "VALIDATION",
  "fields": { "code": "That doesn't look like a Bhavika coupon code." }
}
```

### Redeem only

| HTTP | `code` | Meaning | Shopper message |
|---|---|---|---|
| 404 | `NOT_FOUND` | No coupon with that code exists. | "No such coupon code." Costs 4 rate-limit units (§9). |
| 409 | `ALREADY_REDEEMED` | Spent — against a **different** `externalRef`, or taken by a concurrent request. | "Already used." Do not retry. |
| 410 | `EXPIRED` | Past its expiry. Enforced at the database level, so a coupon becomes unredeemable the instant it lapses. | "Expired." Do not retry. |
| 400 | `MISSING_REFERENCE` | `externalRef` was blank after trimming. Normally caught earlier as `422`; listed for completeness. | Fix your client. |

The validate endpoint returns **none** of these. A well-formed, authenticated validate
call always returns `200`; the verdict is in the `valid` field.

---

## 11. Testing

### 11.1 Sign and send from a shell

Requires `bash`, `curl` and `openssl`.

```bash
#!/usr/bin/env bash
set -euo pipefail

BASE="${BHAVIKA_API_BASE:?}"
SECRET="${BHAVIKA_INTEGRATION_SECRET:?}"

call() {                       # call <path> <json-body>
  local path="$1" body="$2"
  local ts sig
  ts=$(date +%s)
  sig=$(printf '%s' "$ts.$body" \
        | openssl dgst -sha256 -hmac "$SECRET" -binary \
        | openssl base64 -A | tr '+/' '-_' | tr -d '=')
  curl -sS -i -X POST "$BASE$path" \
    -H 'Content-Type: application/json' \
    -H "x-jmd-timestamp: $ts" \
    -H "x-jmd-signature: $sig" \
    --data-binary "$body"          # --data-binary: -d would strip newlines and
                                   # change the bytes you signed
  echo
}

CODE="BHAV-7K2X-9QM4-P8RT"

call /api/integration/coupons/validate "{\"code\":\"$CODE\"}"
call /api/integration/coupons/redeem   "{\"code\":\"$CODE\",\"externalRef\":\"JMD-TEST-0001\"}"
```

### 11.2 Self-test your signing offline

```bash
printf '%s' '1767225600.{"code":"BHAV-7K2X-9QM4-P8RT"}' \
  | openssl dgst -sha256 -hmac 'jmd_test_secret_do_not_use_in_production' -binary \
  | openssl base64 -A | tr '+/' '-_' | tr -d '='
# aLn9DjVNP8kFhaRIA5U00nHbkngzDYZ3OuerHxjTjIM
```

### 11.3 The cases to cover before go-live

| # | Test | Expected |
|---|---|---|
| 1 | Validate a fresh coupon | `200`, `valid: true`, correct `valueRupees` |
| 2 | Validate the same coupon 5 times | Identical response every time; nothing changes |
| 3 | Validate a code that does not exist | `200`, `valid: false`, `reason: "INVALID"` |
| 4 | Redeem a fresh coupon | `200`, `replay: false` |
| 5 | Redeem it again, **same** `externalRef` | `200`, `replay: true`, original `redeemedAt` |
| 6 | Redeem it again, **different** `externalRef` | `409 ALREADY_REDEEMED` |
| 7 | Validate it after redemption | `200`, `valid: false` — indistinguishable from case 3 |
| 8 | Redeem a code that does not exist | `404 NOT_FOUND` |
| 9 | Two concurrent redeems, different refs | Exactly one `200`, one `409` |
| 10 | Any call with no signature header | `401 MISSING_SIGNATURE` |
| 11 | Any call with a signature over the body only (no timestamp prefix) | `401 BAD_SIGNATURE` |
| 12 | Any call with a timestamp 10 minutes old | `401 STALE_REQUEST` |
| 13 | Malformed code, e.g. `BHAV-0000` | `422 VALIDATION` |
| 14 | 100 validates in a minute | `429` with `Retry-After` after the 60th |

Ask us for staging test coupons — including one already redeemed and one already expired,
which you cannot produce yourself.

---

## 12. Retired endpoints — do not use

`POST /api/integration/redeem` returned a signed redirect link that sent the member to
your store to spend points. **It is gone.** It now answers `410 ENDPOINT_RETIRED` on
every method, and the code behind it has been deleted.

Why it mattered: that design checked the member's balance, redirected, and debited the
points only when the store called back. In between, the points were still in the wallet —
so ten browser tabs passed the same check ten times and produced ten redemptions of one
balance. Issuing a coupon debits the points in the same transaction that creates the
coupon, so that window does not exist.

`POST /api/integration/webhook` still exists and still verifies an HMAC over the raw body
alone (no timestamp prefix). It belongs to the retired flow and can only settle history
that predates the cutover. **Do not build against it.** Note that its signing rule is the
old one, which is exactly why the coupon endpoints sign `<timestamp>.<body>` instead — do
not copy a signing routine between the two.

---

## 13. Pre-launch checklist

- [ ] Shared secret received out of band, stored server-side only, never in a client bundle
- [ ] §5.2 worked example reproduces both signatures exactly
- [ ] NTP running on every host that calls Bhavika
- [ ] Code normalised and format-checked before any API call
- [ ] Order reference generated **before** the first redeem attempt and reused on retries
- [ ] Retries only on network failure, `429` and `5xx` — never on `404`/`409`/`410`
- [ ] Goods released only after a `200` from **redeem**, never from validate alone
- [ ] Shopper is warned before redeeming when the basket is worth less than the coupon
- [ ] Bilingual shopper messages wired to `code`, not to the `error` text
- [ ] Egress IP addresses sent to Bhavika
- [ ] All 14 cases in §11.3 pass against staging

---

*Questions on this contract: avanienterprises.contact@gmail.com*
