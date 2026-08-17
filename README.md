# Bhavika Education & Welfare Foundation — Platform (Phase 1)

Production-ready NGO website + user engagement platform (quizzes, referrals, a
point wallet, admin CMS) built to grow into the Phase 2 **Jai Maa Durga**
benefits integration.

> **Tagline:** *Empowerment Through Knowledge & Care.*

## Tech stack

| Layer | Choice |
|------|--------|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS v4 (logo-derived design tokens) |
| Database | MongoDB Atlas + Mongoose |
| Auth | Auth.js (NextAuth v5), Credentials + JWT sessions, bcrypt |
| Media | Cloudinary |
| Email | Resend |
| Rate limiting | Upstash Redis (in-memory fallback in dev) |
| Validation | Zod (shared client/server) |
| Deploy | Vercel |

## Architecture at a glance

- **Domain/service layer** (`src/server/services/*`) holds all business logic
  (wallet, quiz, referral). Route handlers are thin controllers — logic is
  reusable and unit-testable without HTTP.
- **Wallet is the single source of truth**, backed by an immutable
  `WalletTransaction` ledger. Every credit runs inside a Mongo transaction and
  is protected by a unique `idempotencyKey` → **exactly-once** rewards.
- **Server owns the clock** for quizzes (`startedAt`/`expiresAt`). The frontend
  timer is display-only; scoring and expiry are enforced server-side.
- **Serverless-safe** Mongo connection is cached on `globalThis`.

```
src/
  app/
    (public)/        # public marketing site (Navbar + Footer)
    (auth)/          # login, register, password reset
    dashboard/       # authenticated user area (noindex)
    admin/           # admin CMS (role-gated, noindex)
    api/             # route handlers
  components/        # ui kit, layout, brand, feature components
  server/
    db/              # connection + transaction helper
    models/          # Mongoose schemas (source of truth)
    services/        # business logic (wallet, quiz, referral, ...)
    auth/            # Auth.js config, session helpers, password hashing
  lib/               # enums, constants, utils, env (validated)
  types/             # shared TypeScript types
```

## Local setup

1. **Install**
   ```bash
   npm install
   ```
2. **Environment** — copy the template and fill values:
   ```bash
   cp .env.example .env.local
   ```
   Generate an auth secret:
   ```bash
   npx auth secret     # writes AUTH_SECRET, or print one:
   node -e "console.log(require('crypto').randomBytes(33).toString('base64'))"
   ```
3. **MongoDB Atlas**
   - Create a free **M0** cluster (it is a replica set by default → transactions work).
   - Add a database user + allow your IP (or `0.0.0.0/0` for dev).
   - Copy the connection string into `MONGODB_URI`.
4. **Cloudinary** (media) — create a free account, copy cloud name / API key /
   secret into the `CLOUDINARY_*` vars and `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`.
5. **Seed** the admin + default settings (added in a later phase):
   ```bash
   npm run seed
   ```
6. **Run**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest (business-logic tests) |
| `npm run seed` | Seed admin user + default settings + sample content |

## Environment variables

See [`.env.example`](./.env.example) for the full, documented list. Required to
boot: `MONGODB_URI`, `AUTH_SECRET`. Required for full functionality:
`CLOUDINARY_*` (media uploads), `RESEND_API_KEY` (email verification / reset),
`UPSTASH_REDIS_REST_*` (distributed rate limiting).

## Deploy on Vercel

1. Push the repo to GitHub (secrets stay in `.env.local`, which is gitignored).
2. Import the project in Vercel.
3. Add every variable from `.env.example` in **Project → Settings → Environment
   Variables** (set `AUTH_URL` / `SITE_URL` / `NEXT_PUBLIC_SITE_URL` to your
   production domain).
4. In **Atlas → Network Access**, allow Vercel (`0.0.0.0/0`, or Vercel's ranges).
5. Deploy. The Mongo connection is serverless-optimised (pooled + cached).

## Security highlights

- Passwords hashed with bcrypt (cost 12); hash never serialized.
- Every sensitive API re-checks auth + account status server-side (blocked users
  cannot call protected APIs directly).
- Idempotent, transactional point rewards (no double-crediting on retries).
- Server-side quiz scoring & timing (anti-cheat).
- Zod validation on all inputs; rate limiting on auth/contact/quiz endpoints.
- Security headers + `noindex` on private areas; admin actions audit-logged.

## Roadmap

Phase 1A Foundation → 1B Public site → 1C Auth → 1D Dashboard → 1E Quiz →
1F Wallet → 1G Referrals → 1H Leaderboard → 1I Admin → 1J Phase-2 integration
layer → 1K QA & deploy. See the in-repo build notes for status.
