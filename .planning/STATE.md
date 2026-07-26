# STATE — Ravia Farms (last updated: Phase 1 complete, Phase 2 starting)

## Status by phase
- [x] **Phase 1 — Foundation & UI Shell**: COMPLETE. Verified: `tsc --noEmit` clean, `next build` exit 0 (4 routes), dev server HTTP 200 with Ravia branding.
- [ ] **Phase 2 — Backend, DB & Auth**: STARTING. Planned sub-tasks:
  1. Provision Neon; add pooled + unpooled `DATABASE_URL` to Vercel env + `.env.local`.
  2. Prisma schema (Farm, User, PoultryBatch, EggRecord, Incubation, PoultryHealth, VegetableUnit,
     VegetableHealth, Rabbit, RabbitPairing, Dog, DogHeat, FinanceTransaction). `migrate dev`.
  3. `lib/db.ts` Prisma client singleton (globalThis cache; pooled URL at runtime).
  4. Route Handlers under `app/api/*` (poultry, vegetables, rabbitry, canine, finance, auth) — Zod-validated.
  5. Auth.js Credentials provider + role middleware (Owner/Manager/Farm Hand/Vet); seed demo farm+owner.
  6. Replace static placeholder data in section views with TanStack Query calls.

## Decisions locked
- Single Next.js app deploy (no separate NestJS service) → UI + API + Cron in Vercel.
- Neon (serverless Postgres) chosen as the database; Vercel as the platform. (User directive.)
- Zod is the shared validation source (replaces class-validator `@Type(() => Number)` pattern).

## Known issues / debt
- `npm install` must run in **PowerShell**, not WSL (WSL npm hits ETARGET on a transitive `browserslist`).
  Build/dev run fine in WSL afterward.
- Stray dir outside repo: `C:\Users\Askyla\Senen_dev\ravia-farms-app\...` (typo'd first write of the shell).
  Real file is at `components/layout/dashboard-shell.tsx`. User denied `rm`; delete `Senen_dev` when convenient.

## Env / platform notes (from memory)
- WSL boot/build slow; `next build` took ~5 min first clean run. Be patient.
- Owner: Arnold Adero (Mvuvi BlueConnect). Prefers direct execution over extended planning; sequential phases.
