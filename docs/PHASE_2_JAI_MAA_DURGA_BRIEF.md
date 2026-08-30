# Phase 2 — Jai Maa Durga: Developer Brief

**Read this before writing any code.** It exists so you do not spend your first
week rediscovering what Phase 1 already answers.

You have git access to the Bhavika Education & Welfare Foundation repository.
Phase 1 is **live and working** — it is not a prototype to be replaced. Phase 2
is a second platform that connects to it through one narrow, already-specified
seam.

Two corrections to any earlier brief you may have been given:

- The foundation is spelled **Bhavika**, not "Bhuvika". Match the repo.
- Points are **no longer "transferred by redirect"**. That design was removed
  because it was unsafe. See *§3 The integration* — this is the single most
  important thing in this document.

---

## 1. What you are building

**Jai Maa Durga** — an e-commerce platform with membership, multi-wallet
accounting, coupons, lucky draw, recharge, EMI, PIN and a sponsor tree.

**A decision you must make in week one, with the client, before any code:**

> Is Jai Maa Durga a **separate application**, or a **second surface inside this
> repository**?

This is not a style question. It changes the database, the deployment, the auth
model and the integration. Both are defensible:

| | Separate app + shared contract | Same repo, second surface |
|---|---|---|
| Data | Own database. Two user tables. | One database. One `User`, role-scoped. |
| Integration | The signed HTTP contract in `docs/JAI_MAA_DURGA_INTEGRATION.md` | Direct service calls |
| Blast radius | An e-commerce bug cannot touch a child's quiz points | A migration mistake can |
| Cost | Two deployments, duplicated auth/admin/upload plumbing | One deployment, reuse everything |
| Honest risk | More work up front | Phase 1 is a **charity platform for children**; Phase 2 handles **money, EMI and commissions**. Coupling them means a payments incident becomes an NGO incident. |

**Recommendation: separate application, integrating over the existing signed
contract.** The seam is already built, documented and tested. Bhavika stays a
foundation; Jai Maa Durga stays a shop. Reuse Phase 1 by *copying proven
patterns* (§5), not by sharing a database.

If the client chooses one repo, say so explicitly in your Step-2 report and
plan the `User` model migration deliberately — do not drift into it.

---

## 2. The audit is already done — here is the answer

You were told to audit the codebase first. That audit is below. Verify it, do
not redo it.

### Stack

Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind v4 ·
MongoDB Atlas + Mongoose · Auth.js v5 (JWT) · Cloudinary · Brevo (email) ·
Razorpay (donations) · Vitest (**124 tests passing — keep them passing**)

### Models (`src/server/models/`)

`User` `Wallet` `WalletTransaction` `Quiz` `QuizAttempt` `Referral` `Coupon`
`Token` `SystemSettings` `ActivityReward` `UserActivityReward`
`IntegrationTransaction` `AdminAuditLog` `AdminLoginAttempt` `AdminLockout`
`Donation` `DonationCategory` `IdCard` `Content` `GalleryItem` `Video`
`Testimonial` `Partner` `ContactSubmission`

### Services (`src/server/services/`)

28 of them. The ones that matter to you: `wallet` `coupon` `referral` `quiz`
`integration` `auth` `otp` `token` `email` `admin-security` `audit`
`razorpay` `donation` `idcard` `content` `site-data`

### What already exists and works — do NOT rebuild

| Requirement in the client brief | Status |
|---|---|
| Coupon system with printed source | **Built.** `Coupon` model, `CouponSource`, atomic issuing |
| Points wallet + immutable ledger | **Built.** `Wallet` + `WalletTransaction`, idempotency-keyed |
| Referral / sponsor + referral wallet | **Built.** `Referral` model, state machine, exactly-once reward |
| OTP + email verification | **Built.** 6-digit, hashed, attempt-limited |
| Admin panel, audit log, role gating | **Built.** ~14 admin screens + `AdminAuditLog` |
| Brute-force lockout + login geo/VPN log | **Built.** `/admin/security` |
| Payments | **Built.** Razorpay (donations) — reuse the pattern for orders |
| Media upload | **Built.** Cloudinary, signed, size/MIME validated |
| Transactional email | **Built.** Brevo, bilingual templates |
| PDF generation | **Built.** `pdf-lib` (ID cards, donation certificates) |
| REST API for an Android app | **Partly.** `/api/public/*` + `/api/user/*` exist. Extend this shape. |
| Bhavika → Jai Maa Durga seam | **Built and documented.** See §3 |

### What does NOT exist — this is your actual scope

Products · Categories · Cart · Orders · Stock · Membership plans and tiers ·
Multi-wallet accounting (7 wallets) · Recharge (mobile/DTH/FASTag/electricity/
gas/water) · Commission engine · Lucky draw · EMI · PIN system · Jewellery
pricing (metal + making + stone + GST) · Coupon selling/transfer · Sponsor tree

---

## 3. The integration — read this twice

### It is already specified

**`docs/JAI_MAA_DURGA_INTEGRATION.md`** (~650 lines) is your contract. It has
exact request/response JSON, HMAC signing with a worked example, replay rules,
idempotency semantics, the complete error list, and curl tests. **Build against
that document.** If you disagree with something in it, raise it — do not
silently diverge.

### The model changed, and the old description is wrong

An earlier brief says: *user transfers points → redirected to Jai Maa Durga.*
**That design was removed.** It was racy: points were debited only after the
store called back, so ten browser tabs passed the same balance check and issued
ten coupons against one balance. `/api/integration/redeem` now returns **410
Gone**.

**What actually happens now:**

```
Member on Bhavika chooses an amount
        │
        ▼
Bhavika debits the points and creates a Coupon  ← ONE atomic transaction
        │                                          (this is what killed the race)
        ▼
Member sees a code:  BHAV-7K2X-9QM4-P8RT   ₹500   valid 90 days
        │
        ▼
Member enters it at Jai Maa Durga checkout
        │
        ▼
JMD → POST /api/integration/coupons/validate   (read-only, safe to repeat)
JMD → POST /api/integration/coupons/redeem     (exactly once, idempotent on your order ref)
```

**What this means for you:** Jai Maa Durga does not receive point transfers. It
receives **coupon codes** and calls two signed endpoints. Nothing redirects.
The two systems never share a session.

### Rules the contract does not bend on

- Both endpoints are **HMAC-signed**; unsigned or stale requests are rejected.
- `validate` never mutates. `redeem` is exactly-once under concurrency.
- **Redeem is idempotent on *your* order reference.** Retry safely with the
  same ref; a different ref for the same code is a double-spend and is refused.
- Responses carry no member PII — no name, no email, no balance.
- You must obtain `JMD_INTEGRATION_URL` and `JMD_INTEGRATION_SECRET` from the
  client. Bhavika will not issue coupons until an admin also enables redemption
  in its settings.

### Still open on the Bhavika side — confirm before go-live

`expireCoupons()` exists but **nothing calls it**. No cron. Expired coupons are
correctly unusable (every read path checks the clock), but the "these points
were forfeited" wallet entry is never written. Someone must schedule it before
real coupons age past 90 days.

---

## 4. Where Phase 1 will need changes

Small, additive, and worth planning explicitly:

1. **A "My coupons" surface already exists** — extend it to show redemption
   status coming back from your side, if the client wants that visibility.
2. **`SystemSettings.integration`** holds `minRedeemPoints`, `pointsPerRupee`,
   `redeemStepPoints`, `couponValidityDays`. If Phase 2 needs different
   economics, extend this — **and** its zod schema in
   `src/lib/validation/admin.ts`. Miss the schema and the first admin save
   silently deletes your key. This has already happened twice in this codebase.
3. **Do not touch** the quiz, leaderboard, referral or points logic. It is
   tested and live.

---

## 5. Patterns to copy — these are load-bearing

Phase 1 solved these the hard way. Reproduce the reasoning, not just the shape.

### 5.1 Money moves through a ledger, never a balance field

`wallet.service.ts → creditPoints()`. Every change writes an immutable
`WalletTransaction` with a **unique `idempotencyKey`**, inside a Mongo
transaction. The balance is a denormalised cache, never the source of truth.

Your 7 wallets must each work this way. `Wallet` currently has separate
`quizBalance` / `referralBalance` / `activityBalance` sub-balances that sum to
`totalBalance` — extend that shape rather than inventing a parallel one.

### 5.2 Check-then-act is a bug when money is involved

The retired redirect flow is the cautionary tale: reading a balance, then
writing later, leaves a window. **The check and the debit must be in the same
transaction.** See `coupon.service.ts → issueCoupon()` and the concurrency test
in `src/tests/coupon-concurrency.test.ts` — fire N simultaneous requests at one
balance and assert exactly one succeeds. Write that test for orders, EMI,
recharge and PIN.

### 5.3 The client is never the authority

Prices, commissions, point values, membership eligibility and discounts are
recomputed server-side from settings on every request. A cart that posts its own
total is a free-money bug.

### 5.4 Business rules live in settings, not in code

`SystemSettings` + `DEFAULT_SETTINGS` in `src/lib/constants.ts`, merged over
defaults on read so a document written before a field existed still resolves.

The client brief says this repeatedly and means it: **do not hard-code** ₹2
commission, 20% PIN discount, 5000-point conversion, or coupon counts. All admin
configurable.

### 5.5 Admin actions are audited

`audit.service.ts → logAdminAction()`. Manual wallet adjustments, membership
changes, lucky-draw winner selection, PIN issuance and "login as member" all
need an audit row. **"Login as member" especially** — it is an impersonation
feature and must be logged, time-boxed and visible to the member.

### 5.6 API shape for the Android app

Route handlers stay thin; logic lives in services so it is reusable and
testable without HTTP. `src/server/http/index.ts` gives you `handle()`, `ok()`,
`fail()`, typed `DomainError` → HTTP mapping, and `getClientIp()`. Rate limits
are declared in `RATE_LIMITS`.

The app and the website should call the **same** endpoints. Do not build a
parallel `/api/mobile/*`.

---

## 6. Build order

Foundations first. Each phase is releasable and testable.

**Phase A — decide and scaffold**
Repo decision (§1) · auth/member model · Member ID + Sponsor ID · the 7-wallet
ledger · admin settings scaffold
→ *Gate: money cannot move without a transaction row.*

**Phase B — commerce core**
Products · categories · stock · cart · checkout · orders · payment (copy the
Razorpay pattern from `donation.service.ts`) · order history
→ *Gate: an order cannot be paid twice; stock cannot go negative.*

**Phase C — membership and commission**
Free / Area / Chief tiers · admin-configurable plans and benefits · upgrade and
downgrade with audit · commission engine
→ *Gate: every rate is read from settings, none from code.*

**Phase D — coupons, points, referrals**
Coupon generation from all five sources, each stamped with its source ·
sponsor tree · free vs paid referral wallets · point rules and configurable
conversion
→ *Gate: a coupon can never be spent twice; a referral pays exactly once.*

**Phase E — recharge**
Service catalogue · operator/plan fetch · a **real** provider integration ·
commission credit · failed/pending reconciliation
→ *Gate: a pending recharge that later fails must reverse its commission.*
→ **Do not fake this.** The client brief says so explicitly. A stub that
   "succeeds" will be mistaken for working software.

**Phase F — lucky draw**
Draw lifecycle (UPCOMING/ACTIVE/COMPLETED/CANCELLED) · eligible coupon
snapshot · auditable winner selection
→ *Gate: winner selection is reproducible and never overwrites coupon history.*

**Phase G — advanced**
EMI schedules and per-instalment coupons · winner-stops-EMI rule ·
cancellation with approval workflow · PIN system · jewellery pricing ·
coupon selling/transfer
→ *Gate: no balance changes without an approved, recorded transaction.*

**Phase H — Bhavika integration**
Implement the two signed endpoints per `docs/JAI_MAA_DURGA_INTEGRATION.md` and
run its §11 test cases end to end.

---

## 7. Traps specific to this brief

Each of these has already bitten this codebase or is a known hazard:

- **Coupon double-spend.** Concurrency test or it is not done.
- **EMI + lucky draw collide.** "Winner stops remaining EMI" means a paid-off
  product with unpaid instalments. Define the accounting *before* coding it.
- **Coupon selling creates two owners.** Transfer must be atomic and the old
  owner's claim must die in the same transaction.
- **Jewellery rounding.** Metal + making + stone + GST with per-gram weights
  produces fractional paise. Decide the rounding rule once, apply everywhere,
  and show the breakdown before checkout.
- **PIN "mini admin" powers.** A PIN holder activating members is a privilege
  escalation path. Scope it narrowly and audit every use.
- **Recharge is asynchronous.** Providers return pending and settle later.
  Design for reconciliation from day one, not as an afterthought.
- **Settings schema stripping.** Adding a settings field without adding it to
  the zod schema means the first admin save deletes it. Twice now.

---

## 8. Definition of done, per module

- Server-side validation; no trust in client-supplied money or points
- Every balance change has a transaction row with a unique idempotency key
- Admin-configurable where the brief says configurable
- Audit rows for admin actions
- Tests for the concurrency and exactly-once paths
- `npx tsc --noEmit` clean · `npx eslint src` clean · `npm test` green
- Responsive at **360px** — the audience is entry-level Android phones
- No secrets in the repo; `.env*` stays gitignored

---

## 9. What to deliver back first

Before writing feature code, send the client:

1. **The repo decision** from §1, with your reasoning.
2. **A corrections list** — anything in this brief you found to be wrong or
   out of date. It was written from the code, but the code moves.
3. **Your data model** for products, orders, membership, the 7 wallets, EMI and
   PIN — reviewed *before* implementation, because migrations later are
   expensive.
4. **Confirmation you have** `JMD_INTEGRATION_URL` and `JMD_INTEGRATION_SECRET`,
   and a working signed call against the validate endpoint.
5. **Open questions on business rules** the brief leaves ambiguous — commission
   tiers, EMI-winner accounting, jewellery rounding, PIN permissions. Get these
   answered in writing before building them.
