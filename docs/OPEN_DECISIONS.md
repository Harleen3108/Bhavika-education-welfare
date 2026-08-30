# Open decisions — awaiting the owner's confirmation

Everything here is **blocked on a decision, not on engineering effort**. Each
item is something a developer would otherwise have to guess at, and a wrong
guess is expensive to unwind once data exists.

**How to use this:** tick the box, write the answer inline, commit. The
developer reads this file before building the module it belongs to.

Status key — `[ ]` not decided · `[x]` decided, answer recorded below it

---

## A. Blocking Phase 2 development

### A1. One repository or two? — **DECIDED**

`[x]` **Second surface inside this repository.** Same GitHub repo.

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

### A1b. One member login or two? — **DECIDED**

`[x]` **Two separate member accounts, bridged by the coupon code.**

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

### A2. Recharge provider

`[ ]` Confirmed · Provider: ____________________

Mobile, DTH, FASTag, electricity, gas and water recharge cannot be built
without a licensed aggregator. This is a **commercial and compliance step with
lead time**, not a coding task:

- A BBPS-authorised biller aggregator or an equivalent commercial API
- KYC and company documentation
- A signed commercial agreement including the commission slabs

Until this exists, the developer can build the recharge **architecture** —
service catalogue, wallet, commission engine, reconciliation — but not a
working recharge. The client brief already says *"do not create fake production
recharge logic."* Agreed: a stub that appears to succeed will be mistaken for
working software and shipped.

**Who is arranging this, and by when?**

---

### A3. Commission rates and membership benefits

`[ ]` Confirmed

The brief gives two numbers — ₹2 fixed for a Free member, "full commission per
plan" for a Paid member. Needed before the commission engine is built:

| Question | Answer |
|---|---|
| Commission per service, per tier (Free / Area / Chief) | |
| What exactly makes someone a Paid member — any purchase, or a qualifying product/amount? | |
| Referral income: how much, to whom, at what depth of the sponsor tree? | |
| Is referral income paid on enrolment, or only on product sales? *(see C2 — this one matters legally)* | |

All of it will be admin-configurable, but the **launch defaults** must be real
numbers the client stands behind.

---

### A4. EMI + lucky draw collision

`[ ]` Confirmed

The brief says: if an EMI customer wins the lucky draw, remaining EMI stops,
the product is cancelled, and they get the prize.

That leaves a product delivered, partly paid, now cancelled, plus a prize
awarded. The accounting has to be defined **before** it is coded:

- Are instalments already paid refunded, kept, or credited to a wallet?
- Does the customer keep the product **and** the prize, or return the product?
- What happens to commission already paid to their sponsor on those instalments?

**Decision:**

---

### A5. PIN system — scope of "mini admin power"

`[ ]` Confirmed

A ₹1,00,000 PIN grants "limited mini admin power" and the ability to activate
members. **Privilege escalation must be enumerated, never left open-ended.**

- Exactly which actions may a PIN holder perform?
- Can they see other members' data? Whose?
- Can they adjust any balance? (Strong recommendation: **no**.)
- Discount percentage, coupon multiplier and commission — exact launch figures?

**Decision:**

---

### A6. Jewellery pricing and rounding

`[ ]` Confirmed

`metal rate × weight + making + stone + GST` produces fractional paise on
almost every item.

- Rounding rule — nearest rupee, always up, or banker's rounding?
- Where does rounding happen — per line, or once on the order total?
- Who updates the daily gold and silver rates: admin by hand, or a price feed?
- GST rate per category, and is it inclusive or added at checkout?

**Decision:**

---

### A7. Point conversion rate on the Jai Maa Durga side

`[ ]` Confirmed

Bhavika's economics are already set and live: **10 points = ₹1**, minimum
5,000 points, in steps of 500, coupon valid 90 days, and an unused coupon is
forfeited without a refund.

- Does Jai Maa Durga use the same rate for its own points?
- Its own separate rate?
- Do the two point pools ever mix, or stay strictly separate?

**Decision:**

---

## B. Phase 1 — open items

### B1. Nobody schedules coupon expiry

`[ ]` Done

`expireCoupons()` exists and is tested, but **nothing calls it** — no cron, no
route, no `vercel.json`. Verified again today.

Consequence is narrow but real: expired coupons *are* correctly unusable
(every read path checks the clock), so no money is at risk. But the wallet
entry explaining *"these points were forfeited"* is never written. A member
would see a debit in January and then silence.

Needs a scheduled job before the first coupons reach 90 days. Roughly 30
minutes of work — say the word.

---

### B2. Redemption is switched off

`[ ]` Ready to enable

`SystemSettings.integration.redemptionEnabled = false`. Deliberate: issuing
coupons before Jai Maa Durga can accept them traps a family into spending
points on a code with a 90-day clock and nowhere to use it.

Turn it on at `/admin/settings` → Redemption **only once the store is live**.

---

### B3. Jai Maa Durga integration secrets

`[ ]` Issued

`JMD_INTEGRATION_URL` and `JMD_INTEGRATION_SECRET` are unset. The Phase 2
developer needs both. Generate the secret with real entropy and share it
through something other than email or WhatsApp.

---

### B4. Razorpay keys are missing locally

`[ ]` Provided

`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` are absent
from `.env.local`. The app boots — donations simply report "not configured" —
but the donation flow cannot be tested until test keys are added.

---

### B5. The app claims an email was sent when it was not

`[ ]` Fix approved

If Brevo fails, registration still tells the member *"we've emailed you a
code."* The failure is logged server-side and the member sees nothing.

This is exactly why the sender misconfiguration went unnoticed until Brevo
started sending security alerts. That specific cause is fixed, but sends still
fail for bounces, quota limits and provider outages — and you would be blind
again.

~15 minutes. Recommended.

---

### B6. One-click auto-login after verification

`[ ]` Wanted

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

### C1. Lucky draw

`[ ]` Confirmed with counsel

Prize draws and lotteries are **state-regulated in India**, and rules differ by
state. A flow of *buy a product → receive a coupon → enter a draw → win a
prize* may be treated as a lottery or a prize competition depending on
structure and on where participants live.

Worth confirming: whether the draw is permitted in the states you operate in,
whether skill vs chance matters, and what disclosures the draw terms need.

---

### C2. PIN system + sponsor tree + referral income

`[ ]` Confirmed with counsel

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

### C3. Donation receipts and 80G

`[ ]` Confirmed

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
