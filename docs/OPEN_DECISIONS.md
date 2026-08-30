# Open decisions — recommendations awaiting the client's confirmation

Everything here is **blocked on a decision, not on engineering effort**. Each
item is something a developer would otherwise guess at, and a wrong guess is
expensive to unwind once real data exists.

Every open item now carries a **recommended answer** from the development side,
with the reasoning. They are proposals, not decisions.

---

## ⚠️ Who confirmed what — read this before building

| Status | Meaning |
|---|---|
| **`FINAL`** | Settled. Do not reopen. |
| **`PROPOSED`** | Recommended by the development side. Not yet reviewed by anyone. |
| **`DEV-CONFIRMED`** | **Chosen by the DEVELOPER, still NOT signed off by the CLIENT.** Safe to build against, but the client must double-check it before launch. |
| **`OPEN`** | No recommendation possible without information only the client has. |
| **`LEGAL`** | Not an engineering question. Needs a professional, not a developer. |

**Anything marked `PROPOSED` is the development team's opinion.** It is written
here so the client has something concrete to react to instead of an open
question — but it has **not** been agreed by the client. Do not treat a
`PROPOSED` item as a signed-off requirement.

**To confirm an item:** the client changes `PROPOSED` to
`CONFIRMED BY CLIENT — <name>, <date>`, edits the answer if they disagree, and
commits. Until then, a developer building on it is building at risk.

---

## At a glance

| # | Decision | Status | Needs |
|---|---|---|---|
| A1 | Same repository | **FINAL** | — |
| A1b | Separate member accounts | DEV-CONFIRMED | Client double-check |
| A2 | Recharge provider | RESOLVED | Client supplies API after the project |
| A3 | Commission + referral model | DEV-CONFIRMED | Client to confirm the numbers |
| A4 | EMI winner handling | DEV-CONFIRMED | Client double-check |
| A5 | PIN powers | DEV-CONFIRMED | Client double-check |
| A6 | Jewellery rounding + GST | PROPOSED | Client, and their **CA** for GST |
| A7 | Point pools stay separate | PROPOSED | Client double-check |
| B1 | Coupon expiry scheduler | PROPOSED | Go-ahead to build (~30 min) |
| B2 | Redemption switch | OPEN | Turn on when the store is live |
| B3 | Integration secrets | OPEN | Client to issue |
| B4 | Razorpay test keys | OPEN | Client to provide |
| B5 | Email-failure honesty fix | PROPOSED | Go-ahead (~15 min) |
| B6 | One-click auto-login | PROPOSED | Go-ahead (~30–40 min) |
| C1 | Lucky draw legality | **LEGAL** | Lawyer |
| C2 | PIN + sponsor tree legality | **LEGAL** | Lawyer — **do this first** |
| C3 | 80G on receipts | **LEGAL** | CA / client |

**Nothing here is signed off by the client yet.** `DEV-CONFIRMED` means the
development side has chosen a sensible default so work can proceed — it is not
the client's agreement, and every one of them should be walked through with the
client before launch.

---

## A. Blocking Phase 2 development

### A1. One repository or two? — `FINAL`

**Second surface inside this repository. Same GitHub repo.**

> **This one is final and does not need client sign-off.** It is an engineering
> decision about how the code is organised, it does not change any feature the
> client sees, and it is reversible later if the four conditions below are kept.

**Reasoning.** The same person owns and commissions both platforms, and it is
one small team. Splitting would mean rebuilding auth, OTP, the admin shell,
Cloudinary upload, Brevo email, PDF generation, audit logging, rate limiting
and the design system — 28 working services — to buy a boundary that is not
really being maintained anyway. The two platforms are already publicly linked
by design: Bhavika's homepage advertises the Jai Maa Durga discount, so a
separate repository would not have undone that association.

*(An earlier draft of the Phase 2 brief recommended separate applications on
blast-radius grounds. That recommendation is withdrawn — the reputational
argument behind it does not hold when the funnel between the two platforms is
the product.)*

**Four conditions that make this safe. Treat them as requirements:**

1. **Separate Mongo database.** Same Atlas cluster, different `dbName`. Costs
   nothing, keeps the data separable, and stops a commerce migration reaching
   quiz or donor collections.
2. **Separate route groups.** `(public)` stays Bhavika; add `(store)` for Jai
   Maa Durga, with its own layout and navigation.
3. **Commerce code must not import NGO services directly.** Go through the
   coupon contract even in-process. While that boundary holds, splitting later
   is a weekend's work; once it rots, it is never.
4. **Keep the suite green.** 124 tests are the safety net for exactly this kind
   of merge.

---

### A1b. One member login or two? — `DEV-CONFIRMED`

**Recommendation: two separate member accounts, bridged by the coupon code.**

> **Chosen by the developer. The client must double-check this one.** Unlike A1
> it *is* visible to users — it decides whether a parent signs up once or twice
> — so the client should agree to it explicitly before launch.

A Bhavika member and a Jai Maa Durga member are different accounts. This
matches how the platform is actually used: the **child** plays the quiz, the
**parent** shops. The coupon is printable and shareable precisely so it can
cross between two people.

**What this means for the build:**

- Jai Maa Durga gets its **own** member model with Member ID, Sponsor ID,
  membership tier and the seven wallets. Do **not** extend Bhavika's `User`
  with commerce fields.
- Bhavika's `User`, `Wallet` and quiz logic stay untouched.
- The only link between the two is the coupon code, through the contract in
  `docs/JAI_MAA_DURGA_INTEGRATION.md`. Because both live in one repository the
  developer *may* call the coupon service in-process rather than over signed
  HTTP — but the call must go through the same service functions
  (`validateCoupon`, `redeemCoupon`), so the exactly-once and expiry guarantees
  still apply.

If the client later wants a parent to link a child's account, that is an
additive feature, not a schema change.

---

### A2. Recharge provider — `RESOLVED — client supplies the API later`

**The client already has, or will obtain, a recharge API and will hand it over
after the project.** This is therefore no longer a blocker.

**What the developer builds now:** everything except the provider call.

- Service catalogue (mobile, DTH, FASTag, electricity, gas, water)
- Operator and plan browsing
- The recharge wallet and its ledger
- The commission engine (see A3)
- Order/transaction records with a **status machine**
- Reconciliation for pending and failed recharges

**How to build the provider seam:** one interface, one adapter.

```
interface RechargeProvider {
  fetchOperators(service)      // may be static until the API arrives
  fetchPlans(operator, circle)
  submitRecharge(request)      // returns SUCCESS | PENDING | FAILED
  checkStatus(providerRef)     // reconciliation for PENDING
}
```

Ship a `MockRechargeProvider` behind a config flag for development. When the
client provides the real API, only the adapter is written — nothing else moves.

**Two hard rules, because this is where recharge platforms lose money:**

1. **Recharge is asynchronous.** Providers return `PENDING` and settle minutes
   or hours later. Design reconciliation from day one; do not treat the first
   response as final.
2. **Commission is credited on confirmed success only** — never on submission.
   A `PENDING` that later fails must reverse cleanly, and the reversal must be
   a ledger entry, not an edit.

The mock must never be shippable to production. Gate it on `NODE_ENV` and make
it log loudly.

---

### A3. Commission rates and membership benefits — `DEV-CONFIRMED`

> **Chosen by the developer. The client must still double-check the numbers.**
>
> **Recharge commission — a share of what we actually receive.**
> Free = 40% of provider payout capped at ₹2 · Area = 60% · Chief = 80%.
> All three admin-editable. The cap is what stops the ₹2 promise costing more
> than the recharge earns.
>
> **Referral income — one level, product sales only, and admin-editable.**
>
> Careful with "admin-editable" here, because it is not all equally safe:
>
> | Setting | Admin may change | Why |
> |---|---|---|
> | Referral **percentage** | ✅ Yes | An ordinary business number |
> | Minimum order for Paid membership | ✅ Yes | An ordinary business number |
> | Pay on **enrolment** as well as sales | ⚠️ **Not without legal clearance** | This is the switch that turns lawful direct selling into what the 1978 Act prohibits |
> | Tree **depth** beyond one level | ⚠️ **Not without legal clearance** | Same reason |
>
> **Build the percentage as a normal setting. Do NOT ship a UI toggle that
> silently enables enrolment-based or multi-level payouts.** If the client wants
> those later, they arrive with the lawyer's answer to C2 — not through a
> settings screen an admin can flip on a Tuesday.



**⚠️ The most financially dangerous item on this page.** The spec says a Free
member earns **₹2 fixed** per recharge. Taken literally that loses money:

> An aggregator typically pays **1–4%** of the recharge value. On a ₹10 mobile
> recharge you receive roughly **₹0.10–0.40** and would pay out **₹2**. Every
> small recharge is a loss, and small recharges are the most common kind.

**Recommendation — commission is always a share of what we actually receive:**

| Tier | Recommended commission | Why |
|---|---|---|
| Free | **40% of provider payout, capped at ₹2** | Honours the "₹2" promise without ever paying out more than was earned |
| Area | **60% of provider payout** | |
| Chief | **80% of provider payout** | |

All three admin-configurable. **Never a flat amount that can exceed revenue.**
If the client insists on a true flat ₹2, add a minimum recharge value (₹100+)
below which no commission is paid — otherwise this is an arbitrage anyone can
run in a loop.

**Becoming a Paid member — recommendation:** a configurable **minimum order
value** (suggest ₹2,000 to start), not "any purchase". Otherwise a ₹50 grocery
order grants full commission rights permanently.

**Referral income — recommendation, and please read C2 first:**

- **Direct sponsor only. One level. No deep tree payouts.**
- Paid **only on product sales**, as a percentage of margin — **never on
  enrolment or on PIN purchase**.

That single rule is the clearest line between lawful direct selling and a
money-circulation scheme. Multi-level payouts on enrolment are exactly what the
1978 Act prohibits. Build one level; the client can seek legal clearance later
if they want more.

**Client must supply the actual launch numbers:**

| | Answer |
|---|---|
| Provider commission share per tier | |
| Minimum order value for Paid membership | |
| Referral % on product sales | |

---

### A4. EMI + lucky draw collision — `DEV-CONFIRMED`

> **Chosen by the developer. Client must double-check.**
> **Winner keeps the product, remaining EMI stops, prize awarded on top.**
> Paid instalments are not refunded, sponsor commission already paid stands.
> Schedule closes as `WON`, not `CANCELLED`.

If an EMI customer wins the draw: remaining EMI stops, product is "cancelled",
prize awarded. That leaves a product delivered, partly paid, now cancelled, and
a prize on top. The accounting must be defined before it is coded.

**Recommendation — the simplest version that is generous and auditable:**

| Question | Recommended answer |
|---|---|
| Does the winner keep the product? | **Yes.** Taking back a delivered product from a prize winner is a support nightmare and reads as a trick. |
| Remaining instalments? | **Cancelled.** Schedule closed as `WON`, not `CANCELLED` — the distinction matters in reports. |
| Instalments already paid? | **Not refunded.** They paid toward a product they keep. Refunding *and* gifting the product *and* awarding a prize is three benefits for one win. |
| Sponsor commission already paid? | **Stands.** Clawing back a sponsor's earned commission because someone else won is unfair and will cause disputes. |
| The prize itself? | Awarded separately, tracked on the draw record, not on the order. |

Net effect: the winner stops paying, keeps the product, and receives the prize.
Easy to explain in one sentence — which is the real test.

**Client must confirm.** If they instead want the product returned and
instalments refunded, say so now: it is a materially different build with
refund flows, reverse logistics and stock restoration.

---

### A5. PIN system — scope of "mini admin power" — `DEV-CONFIRMED`

> **Chosen by the developer. Client must double-check.**
> **Exactly two powers:** activate a member under their own sponsor ID, and
> view their own direct downline (name, join date, activation status). Nothing
> else. Implemented as a capability on the member record, never as an admin
> role — put it in the admin role system and someone widens it by accident.

A ₹1,00,000 PIN grants "limited mini admin power". **Privilege must be
enumerated, never left open-ended** — this is the single most dangerous phrase
in the whole client brief.

**Recommendation — a PIN holder may do exactly two things:**

1. **Activate a member under their own sponsor ID.** Every activation writes an
   audit row naming the PIN, the holder and the new member.
2. **See their own direct downline** — name, join date, activation status,
   nothing else.

**And explicitly may NOT:**

- ❌ Adjust any wallet, point or coupon balance — **ever**
- ❌ See another member's contact details, orders or balances
- ❌ Reach the admin panel, or any admin API
- ❌ Change prices, plans, membership tiers or commission
- ❌ Act on anyone outside their own downline

They are not an admin. They are a member with one extra button. Implement it as
a **capability on the member**, not as an admin role — if it goes in the admin
role system, someone will widen it later by accident.

**Recommended launch figures — all admin-configurable:**

| | Recommended |
|---|---|
| Product discount | 20% (as the brief says), capped by category — jewellery at 20% may be below cost |
| Coupon multiplier | 2× |
| Commission | Chief-tier rate |
| Validity | 12 months, then benefits lapse |

**Please read C2 before confirming.** A ₹1,00,000 payment that grants the right
to enrol members and earn from them is the exact structure the money-circulation
rules describe. Pairing it with **A3's one-level, sales-only referral rule** is
what keeps it defensible.

---

### A6. Jewellery pricing and rounding — `PROPOSED`

`metal rate × weight + making + stone + GST` produces fractional paise on
nearly every item.

**Recommendation:**

| Question | Recommended answer |
|---|---|
| Internal arithmetic | **Integer paise throughout.** Never floats for money — `0.1 + 0.2 !== 0.3`, and jewellery has enough multiplication to make that visible. |
| Where to round | **Once, on the line total, after GST.** Rounding each component compounds the error and stops the shown breakdown adding up. |
| Rounding rule | **Nearest rupee, half up.** Predictable and matches what customers expect on an Indian invoice. |
| Daily gold/silver rate | **Admin enters it, with the timestamp shown to the customer** ("Gold rate as on 20 Aug, 10:00"). A live feed is a later upgrade, not a launch requirement. |
| Rate changes mid-order | **Price is locked when the item enters the cart**, for a configurable window (suggest 30 minutes), then re-quoted. Never re-price silently at checkout. |
| Breakdown visibility | **Always shown before payment** — metal, weight, making, stone, GST, total. Jewellery buyers expect it and its absence reads as hiding something. |

**GST — confirm with the client's CA, not with a developer.** Indian jewellery
GST is generally understood as **3% on metal value** and **5% on making
charges**, but treatment varies with invoicing and is not something this
document should assert. Build it as a configurable per-category rate with
separate metal and making components so whatever the CA says can be entered.

---

### A7. Point conversion on the Jai Maa Durga side — `PROPOSED`

Bhavika's economics are live and settled: **10 points = ₹1**, minimum 5,000, in
steps of 500, coupon valid 90 days, unused coupons forfeited.

**Recommendation: keep the two point pools strictly separate.**

| | Recommended |
|---|---|
| Do the pools mix? | **No. Never.** |
| Bhavika points | Convert to a **coupon** only — already built, already live |
| Jai Maa Durga product points | Their **own** balance, own admin-set conversion rate |
| Same rate? | Start at 10 points = ₹1 for familiarity, but keep it a **separate setting** so it can diverge |

**Why "never mix" matters beyond tidiness.** If a child's quiz points could flow
into a commerce balance that earns commission, then quiz activity becomes a way
to generate commission-earning value — which drags the NGO into the regulatory
question in C2 that it currently sits well outside of. The coupon is a
deliberate one-way valve: it carries value into the shop and nothing comes back.

Keep it that way.

---

## B. Phase 1 — open items

### B1. Nobody schedules coupon expiry — `PROPOSED`

**Recommendation: schedule it before the first coupons reach 90 days.** ~30 min.

`expireCoupons()` exists and is tested, but **nothing calls it** — no cron, no
route, no `vercel.json`. Verified again today.

Consequence is narrow but real: expired coupons *are* correctly unusable
(every read path checks the clock), so no money is at risk. But the wallet
entry explaining *"these points were forfeited"* is never written. A member
would see a debit in January and then silence.

Needs a scheduled job before the first coupons reach 90 days. Roughly 30
minutes of work — say the word.

---

### B2. Redemption is switched off — `OPEN`

**Recommendation: leave it off until the store can accept a coupon.** Turning it on earlier traps a family into spending points on a code with a 90-day clock and nowhere to use it.

`SystemSettings.integration.redemptionEnabled = false`. Deliberate: issuing
coupons before Jai Maa Durga can accept them traps a family into spending
points on a code with a 90-day clock and nowhere to use it.

Turn it on at `/admin/settings` → Redemption **only once the store is live**.

---

### B3. Jai Maa Durga integration secrets — `OPEN`

**Recommendation:** generate with real entropy, share out of band — not over email or WhatsApp.

`JMD_INTEGRATION_URL` and `JMD_INTEGRATION_SECRET` are unset. The Phase 2
developer needs both. Generate the secret with real entropy and share it
through something other than email or WhatsApp.

---

### B4. Razorpay keys are missing locally — `OPEN`

**Recommendation:** add the **test** keys now so donations can be exercised; live keys only at launch.

`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` are absent
from `.env.local`. The app boots — donations simply report "not configured" —
but the donation flow cannot be tested until test keys are added.

---

### B5. The app claims an email was sent when it was not — `PROPOSED`

**Recommendation: fix it.** ~15 min. Without it you are blind to every future delivery failure, exactly as you were to the sender misconfiguration.

If Brevo fails, registration still tells the member *"we've emailed you a
code."* The failure is logged server-side and the member sees nothing.

This is exactly why the sender misconfiguration went unnoticed until Brevo
started sending security alerts. That specific cause is fixed, but sends still
fail for bounces, quota limits and provider outages — and you would be blind
again.

~15 minutes. Recommended.

---

### B6. One-click auto-login after verification — `PROPOSED`

**Recommendation: worth doing, but only properly.** ~30–40 min with tests. Current behaviour (login with the email pre-filled) is safe and acceptable if you would rather not spend the risk budget here.

Today, verifying redirects to login with the email pre-filled — one password
entry. True zero-click needs a single-use handoff token whose subject is read
from the token record, never a client field. Four files, ~30–40 min with tests.

Deliberately not built without approval: minting a session from an email
endpoint is where account-takeover bugs live, and this codebase already
produced one.

---

## C. To confirm with a professional — not engineering questions

**I am not a lawyer and this is not legal advice.** These three features have a
specific regulatory shape in India, and it is far cheaper to confirm now than
after launch. Raising them so nobody is surprised later.

### C1. Lucky draw — `LEGAL`

Prize draws and lotteries are **state-regulated in India**, and rules differ by
state. A flow of *buy a product → receive a coupon → enter a draw → win a
prize* may be treated as a lottery or a prize competition depending on
structure and on where participants live.

Worth confirming: whether the draw is permitted in the states you operate in,
whether skill vs chance matters, and what disclosures the draw terms need.

---

### C2. PIN system + sponsor tree + referral income — `LEGAL`

**The most important item on this page.**

The combination described — pay ₹1,00,000 for a PIN, gain the right to
activate members under your sponsor ID, and earn commission and referral income
from those members — has the structure that the **Prize Chits and Money
Circulation Schemes (Banning) Act, 1978** and the **Consumer Protection (Direct
Selling) Rules, 2021** are written about.

The distinction regulators draw is usually this:

- Income derived from **genuine product sales** to end customers → direct
  selling, generally permitted with compliance
- Income derived mainly from **enrolling other members** → money circulation,
  banned

Which side this design falls on depends on details that are still undecided —
specifically **A3** (is referral income paid on enrolment or on sales?) and
**A5** (what a PIN actually buys). That is why those two questions matter
beyond the code.

Please have a lawyer review the model **before** the developer builds it.
Rebuilding a commission engine after launch means restating everyone's earnings.

---

### C3. Donation receipts and 80G — `LEGAL`

The current certificate is correctly worded — "Certificate of Donation" and
"Certificate of Appreciation", with **no tax-deduction claim**. That is the
safe default and I have not changed it.

If donors should be able to claim tax deduction, that requires the foundation's
**80G registration**, and the receipt must then carry the registration number,
the donor's PAN and the prescribed wording. Confirm whether 80G registration
exists, and whether receipts should reference it.

---

## D. Already decided — for the record

So the developer does not reopen settled questions:

| Decision | Answer |
|---|---|
| Foundation name | **Bhavika** (not "Bhuvika") |
| Bilingual approach | English + Hindi shown together, no language toggle |
| Points → store | Bhavika **issues a coupon**; no redirect. `/api/integration/redeem` is retired (410) |
| Redemption economics | 10 points = ₹1 · min 5,000 · steps of 500 · valid 90 days |
| Unused coupon expiry | Points **not** refunded — stated to the member before they generate one |
| Member lockout | 10 wrong passwords, then 5/10/20/40-minute escalation |
| Admin lockout | 5 wrong attempts, same escalation |
| Login location | Browser GPS **and** the network estimate, shown separately |
| Attempted passwords | **Not stored.** The log records that a password was wrong, never what was tried |
