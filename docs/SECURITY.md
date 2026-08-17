# Security Review — Bhavika Platform (Phase 1)

A mapping of the required security properties to how they're implemented.

## Authentication & sessions
- Passwords hashed with **bcrypt (cost 12)**; the hash has `select: false` and is stripped from JSON — never serialized to the client.
- **Auth.js (NextAuth v5)**, JWT sessions, built-in CSRF protection on the auth endpoints.
- Login rejects **BLOCKED/SUSPENDED** users at the `authorize` boundary — they cannot obtain a session at all.
- One-time tokens (email verify / password reset) are stored only as **SHA-256 hashes** with **TTL auto-expiry**, and are consumed atomically (`findOneAndUpdate`) → truly single-use.
- Password reset & "forgot password" **do not reveal whether an email exists** (no user enumeration).

## Authorization (RBAC + IDOR)
- `requireUser` / `requireAdmin` re-verify identity **and live account status from the DB** on every sensitive call — a token that was valid before a block is rejected.
- Edge `proxy.ts` gates `/dashboard` (auth) and `/admin` (admin role); admin layout re-checks role server-side (defense in depth, never relies on hidden UI).
- Quiz attempts, results, and wallet reads are **scoped to the owner** (`attempt.user === session.user.id`) → IDOR-proof.
- All admin mutations run through server actions wrapped by `runAdmin` (requireAdmin) and are **audit-logged**.

## Money-path integrity (exactly-once)
- **Wallet ledger** is the source of truth; every change runs in a **Mongo transaction** and carries a unique `idempotencyKey`. Retries / double-clicks / concurrency → exactly one credit (verified by tests, incl. a 6-way concurrent race).
- **Quiz**: server owns the clock (`startedAt`/`expiresAt`), grades server-side, and finalizes via an atomic `IN_PROGRESS → SUBMITTED` transition → single reward. Correct answers are never sent before submission.
- **Referral**: unique `referredUser` index (one per person), atomic `→ REWARDED` transition, idempotency-keyed credit; self-referral impossible.
- **Activity**: unique `{user, activityKey, grantKey}` index + `maxPerUser` cap → replay-proof.
- **Redemption** (Phase 2): points debited only on **HMAC-verified** server-to-server webhook, idempotency-keyed; balances never travel in a URL.

## Input handling & abuse
- **Zod validation** on every API/route/action input (client + server).
- **Rate limiting** (Upstash, in-memory fallback) on contact, register, login, forgot/reset, quiz start/submit.
- Contact form: honeypot + IP stored only as a **salted hash** (no raw PII).
- File uploads: server-side **type + size validation**; admin-only.

## Transport & headers
- Security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS) via `next.config.ts`.
- `poweredByHeader` disabled. Remote image hosts allow-listed.

## Secrets & config
- Server env is **validated + `server-only`** (`lib/env.ts`) — importing it into a client component fails the build, preventing secret leakage.
- `.env*` gitignored; `.env.example` documents every variable. No secrets in the repo.

## SEO / privacy
- `robots.ts` + per-page `robots: { index: false }` keep `/admin`, `/dashboard`, wallet and auth pages **out of search indexes**.

## Known Phase-1 acceptance notes
- Quiz submission allows a small grace window then marks late submissions `EXPIRED` (still graded) — the timer is enforced server-side; this is intentional for fair auto-submit.
- Manual admin adjustments can create negative sub-bucket balances if over-debited across buckets; total is guarded against over-debit. Adjustments are always audited.
