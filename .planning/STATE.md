# STATE — Ravia Farms (last updated: Phase 2 code complete; build env blocker)

## Status by phase
- [x] **Phase 1 — Foundation & UI Shell**: COMPLETE. Verified earlier: `tsc --noEmit` clean, `next build` exit 0, dev server HTTP 200.
- [x] **Phase 2 — Backend, DB & Auth**: CODE COMPLETE, typechecks clean (`tsc --noEmit` exit 0).
       Blocked only on the **production `next build` SSG prerender** under this WSL/Windows hybrid env.
       Dev server works. See "Build blocker" below.

## Phase 2 what was built
- `prisma/schema.prisma` — Farm, User, PoultryBatch, EggGroup(later), EggRecord, Incubation,
  PoultryHealth, VegetableUnit, VegetableHealth, Rabbit, RabbitPairing, Dog, DogHeat, FinanceTransaction.
  `binaryTargets = ["native","debian-openssl-3.0.x"]` (WSL build needs debian engine).
- `lib/db.ts` — Prisma client singleton (cached on globalThis; reads DATABASE_URL at connect time).
- `lib/auth.ts` — Auth.js v4 Credentials provider, JWT session, role in token (OWNER/MANAGER/FARM_HAND/VET),
  `getSession()` + `requireUser()`.
- `lib/api.ts` — `withHandler` wrapper: auth + Zod validation + try/catch → JSON.
- `app/api/auth/[...nextauth]/route.ts` — NextAuth handler.
- `app/api/seed/route.ts` — POST creates demo Farm + OWNER (env-gated by SEED_PASSWORD).
- `app/api/{poultry,vegetables,rabbits,dogs,finance}/route.ts` — GET list + POST create.
  Deploy/register POSTs auto-create an EXPENSE FinanceTransaction (operations→finance).
  Finance POST distinguishes revenue vs expense; revenue links sourceType (enum-mapped from UI label).
- `app/auth/signin/page.tsx` — sign-in form using `next-auth/react`.
- `lib/api-client.ts` + `components/sections/use-ravia-data.ts` — TanStack Query hooks.
- All 6 section views now read live data via TanStack Query (placeholder replaced).

## CRITICAL build-environment learnings (do NOT re-derive — cost many iterations)
1. **Install deps under WSL, not Windows.** `npm install` MUST run in WSL (not PowerShell) so node_modules
   symlinks are WSL-native. Windows-installed node_modules + WSL `next build` → fake "two React copies"
   → "Invalid hook call" / "r.default.preload is not a function" during SSG prerender (even on Next's own
   `_not-found` page). WSL `npm install` can hit ETARGET on a transitive `browserslist` via the WSL npm
   registry mirror — if so, the package.json ranges are valid; just retry or use the working registry.
2. **`next-auth@4` + `next@14.2.x` is incompatible** at build: `n.cache is not a function` in
   `buildAppStaticPaths` for `/api/auth/[...nextauth]`. FIX: pin `next@14.1.4` (last version compatible with
   next-auth v4). Do NOT use next 14.2.x with next-auth v4.
3. **Do NOT alias `react`/`react-dom` in next.config.** Aliasing to the package directory caused the
   `preload is not a function` mismatch; aliasing to the compiled copy broke `useContext`. The real cure for
   the duplicate-React symptom was #1 (WSL-native install), not webpack aliases. `preact:false` alias alone
   was insufficient.
4. **Prisma `binaryTargets` must include `debian-openssl-3.0.x`** or the WSL build throws
   "could not locate the Query Engine for debian-openssl-3.0.x" (client was generated for windows).
   Always `prisma generate` from WSL after a Windows-side install.
5. **`next build` is very slow on WSL** (~10–15 min for the type-check phase). Be patient; it is not hung
   unless it exceeds ~20 min at "Checking validity of types". Run via background + poll.
6. `eslint.ignoreDuringBuilds: true` set in next.config (no eslint config yet).

## To finish Phase 2 verification
- Provide Neon `DATABASE_URL` (+ `DATABASE_URL_UNPOOLED`) and `AUTH_SECRET` in `.env.local`.
- `npx prisma migrate dev` (or `migrate deploy` for prod) to create tables.
- POST `/api/seed` (with SEED_EMAIL/SEED_PASSWORD set) to create demo Farm + OWNER.
- `npx next build` FROM WSL (node_modules already WSL-native) — should now pass prerender.
- (If prerender still fails) fallback: add `export const dynamic = "force-dynamic"` to `app/page.tsx` and
  `app/auth/signin/page.tsx`, or set `typescript.ignoreBuildErrors` is NOT recommended (typecheck already passes).

## Decisions locked
- Single Next.js app deploy (UI + API + Cron in Vercel). Neon DB. Zod = shared validation.

## Env / platform notes (from memory)
- WSL boot/build slow. Owner: Arnold Adero (Mvuvi). Prefers direct execution, sequential phases.
- Stray dir outside repo: `C:\Users\Askyla\Senen_dev\...` (typo'd first write). Real file is
  `components/layout/dashboard-shell.tsx`.
