# Manual QA Checklist — Bhavika Platform (Phase 1)

Run through this before each production deploy. Prereq: `npm run seed` has been
run against the target database (creates admin + sample content + a live quiz).

## Automated tests
- [ ] `npm test` → all suites pass (wallet idempotency, quiz scoring/anti-cheat, referral single-reward, activity caps, signing, password).
- [ ] `npm run build` → succeeds with no type errors.

## Public website (logged out)
- [ ] Home renders hero, stats, pillars, engagement, and (once seeded) gallery/testimonials/partners previews.
- [ ] About, Mission & Vision, Gallery (lightbox + filter + load more), Videos (modal player), Testimonials, Partners all render.
- [ ] Contact form: validation errors show; valid submit succeeds; submission appears in `/admin/contacts`; rate limit trips after repeated submits.
- [ ] Footer links, WhatsApp/Call buttons, and map load. `robots.txt` + `sitemap.xml` resolve.

## Auth
- [ ] Register (with and without `?ref=CODE`); verification email link logged (dev) or received (prod).
- [ ] Visiting the verify link activates the account (PENDING → ACTIVE).
- [ ] Login works; wrong password shows a friendly error; blocked/suspended user cannot log in.
- [ ] Forgot password → reset link → new password → login with new password.
- [ ] Logout returns to home.

## Dashboard (user)
- [ ] Overview shows points snapshot, available daily/weekly quiz, recent activity, referral summary, leaderboard preview.
- [ ] Unverified user sees the "verify your email" banner and cannot start a quiz.
- [ ] Profile edit saves; completing name+phone+city grants the one-time bonus (toast + wallet updates); re-saving does not re-grant.

## Quiz (the critical flow)
- [ ] Start quiz → timer counts down; refresh mid-quiz → same attempt resumes with remaining time.
- [ ] Submit → server-scored result with per-question review; points appear in wallet.
- [ ] Re-open the quiz → shows the result (no second attempt); wallet unchanged.
- [ ] Changing device clock does not grant extra time (server enforces expiry).
- [ ] Second attempt blocked when max attempts reached.

## Wallet
- [ ] Breakdown (total/quiz/referral/activity) matches transactions.
- [ ] Ledger filters by source; pagination works; empty state shows for new users.

## Referral
- [ ] Copy link + WhatsApp share work; code matches profile.
- [ ] New user signs up via link → appears as PENDING in referrer's list.
- [ ] After the referred user verifies + completes a quiz → referrer gets the reward once; status shows REWARDED.

## Leaderboard
- [ ] Daily/weekly/monthly/all-time tabs switch; your rank card shows; top-3 medals; "You" row appears if off-page.

## Benefits (Phase 2 entry)
- [ ] With redemption disabled (default): "Coming soon" state with balance.
- [ ] Toggling redemption on in `/admin/settings` shows the redeem form (leave off for Phase 1).

## Admin
- [ ] Non-admin users are redirected away from `/admin`.
- [ ] Dashboard stats + audit feed populate.
- [ ] Content editors (About/Mission/Contact) save and update public pages.
- [ ] Gallery/Videos/Testimonials/Partners: add/edit/delete; image upload works (or URL fallback if Cloudinary unset).
- [ ] Quiz management: create quiz → add questions (mark correct) → activate → it appears for users.
- [ ] Users: search; open detail; suspend/block/activate; manual point adjustment creates an audited transaction.
- [ ] Wallet monitoring, Referrals, Contacts (view + status), Settings all load and function.

## Responsive (test each breakpoint)
- [ ] Mobile (360–430px): no horizontal scroll; nav becomes hamburger; dashboard sidebar becomes drawer; tables become cards where applicable; quiz + forms are touch-friendly.
- [ ] Tablet (768px): grids reflow to 2-up; admin usable.
- [ ] Laptop/Desktop/Large (1024/1280/1536px+): content is centered and capped; no stretched layouts.

## Production readiness
- [ ] All env vars set in Vercel (see `.env.example`); `AUTH_URL`/`SITE_URL`/`NEXT_PUBLIC_SITE_URL` point to the production domain.
- [ ] MongoDB Atlas network access allows Vercel.
- [ ] Admin password changed from the seed default.
