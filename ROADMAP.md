# Ravia Farms — Full-Stack Development Roadmap

This document is the engineering plan to evolve the **`index.html` prototype** (offline, single-user,
`localStorage`-backed) into a production **full-stack farm-management platform**. It covers the phased
build, the recommended tech stack with rationale, the data-model migration, and deployment.

Read [`README.md`](./README.md) first for the product/feature context.

---

## 0. Guiding Principles

1. **Preserve the brand.** The onyx/black theme, green `#4BAE4F` + orange `#F58220`, Pacifico logo, and
   modal+toast UX are the product identity. The rewrite must look and feel the same.
2. **Operations auto-post to finance.** The single most important behavior: deploying/registering a batch
   creates an expense; selling from a batch creates batch-linked revenue. The P&L engine is the source of
   truth, not a side report.
3. **Offline-first field use.** Farmers log on phones with bad connectivity. The app must work without a
   network and sync when reconnected (PWA + queue).
4. **Domain constants are sacred.** 84-day poultry cycle, 84 stems/unit, 30 eggs/tray, Silverlands vaccine
   days (0/12/14/21/28/42), 21-day incubation, 31-day kindling, 180-day canine heat. Make them
   *configurable per farm*, but keep the defaults.
5. **Small, sequential, committable phases.** Each phase below is independently shippable.

---

## 1. Tech Stack Recommendation

### Why this stack
The owner already runs **NestJS + Next.js + Prisma + PostgreSQL** (Mvuvi BlueConnect). We reuse that
familiarity — same languages, same Prisma data layer — but for Ravia Farms we consolidate onto a single
**Next.js + Neon + Vercel** deploy so there is one playbook, one repo, and preview databases per PR. A
separate NestJS API (Hetzner/Render) remains a documented fallback if the app outgrows Route Handlers.

### Chosen Stack — Neon + Vercel (single deploy)

> Decision: **Neon (serverless Postgres) + Vercel (Next.js)**. One repo, one deploy target, preview
> databases per PR via Neon branches. This is the lean single-app path — no separate API service to run.

| Layer | Choice | Why |
|---|---|---|
| **App framework** | **Next.js (App Router) + TypeScript** | UI + API in one deploy; Vercel-native; PWA support. |
| **UI** | **Tailwind CSS + shadcn/ui** | Reproduce the exact Ravia design system as reusable primitives; dark theme by default. |
| **Data layer** | **Prisma + Neon Postgres** | Type-safe ORM; Neon gives serverless scaling-to-zero + instant branched databases for previews. |
| **Server logic** | **Next.js Route Handlers + Server Actions** | Replaces the separate NestJS service; sufficient for this app's scale. |
| **Validation** | **Zod** (shared client+server) | Single schema source of truth; validates API input and forms. |
| **Auth** | **Auth.js (NextAuth) — Credentials provider** | Email/password sessions; roles (Owner, Manager, Farm Hand, Vet). Hosted inside the same Next app. |
| **State / cache** | **TanStack Query** | Server-state cache + optimistic UI for snappy field logging. |
| **Offline / PWA** | **Serwist (next-pwa successor) + IndexedDB (Dexie)** | Field logging without network; outbox queue synced on reconnect. |
| **Object storage** | **Cloudflare R2 / AWS S3** | Health "photo proof" — base64-in-localStorage will not scale. Presigned PUT URLs from a Route Handler. |
| **Scheduling / alerts** | **Neon + Vercel Cron** (or Inngest) | Daily scan for vaccine/heat/kindling due windows → push/email/SMS. Vercel Cron runs on the same platform. |
| **Deploy** | **Vercel** | Frontend + API + Cron in one place; preview env per PR auto-wired to a Neon branch. |
| **CI** | **GitHub Actions** | Lint, typecheck, test, `prisma migrate deploy` on preview/production. |

Why Neon specifically:
- **Branching** maps 1:1 to Vercel preview deployments — every PR gets an isolated DB.
- **Scale to zero** keeps cost near-zero when the farm isn't actively querying.
- **Connection pooling** (Neon pooled endpoint) avoids exhausting connections in serverless.
- Native **`DATABASE_URL` + `DATABASE_URL_UNPOOLED`** split — use the pooled URL in serverless, unpooled for migrations.

### Alternative (if you later need a separate API)
If the app grows beyond what Route Handlers handle, extract the API into **NestJS + Prisma** (your
Mvuvi pattern) deployed on Hetzner/Render, still using **Neon** as the database. The Prisma schema and
Zod contracts carry over unchanged.

---

## 2. Data Model Migration (localStorage → PostgreSQL)

The prototype's flat arrays become normalized tables. Primary design decision: a **`Farm`** entity at the
top so multi-tenancy is possible later, and a **`finance_transactions`** table that is the single ledger.

```
Farm (id, name, currency='KES', settingsJSON)
User (id, farmId, email, role, passwordHash)

Batch / animal tables
PoultryBatch   (id, farmId, name, breed, source, count, unitPrice, deployDate, status)
EggRecord      (id, batchId?, count, date)
Incubation     (id, farmId, eggCount, startDate)
PoultryHealth  (id, batchId, issue, affected, mortality, treatment, photoUrl?, date)

VegetableUnit  (id, farmId, cropType, source, units, pricePerStem, stems, deployDate)
VegetableHealth(id, unitId, issue, affected, loss, action, photoUrl?, date)

Rabbit         (id, farmId, tagId, breed, sex, source, price, acquiredDate)
RabbitPairing  (id, doeId, buckId, date)            -- kindling = date + 31d
Dog            (id, farmId, name, breed, sex, source, price, pedigree)
DogHeat        (id, dogId, date)                    -- next = date + 180d

FinanceTransaction (id, farmId, type[revenue|expense], category, description,
                   qty, unitPrice, amount, sourceType?, sourceRefId?, date)
```

Key rules to carry over:
- `FinanceTransaction.amount` is always derived: `qty * unitPrice` (or manual for non-feed expenses).
- Deploying a `PoultryBatch` / `VegetableUnit` / `Rabbit` / `Dog` inserts a paired `expense` transaction.
- Revenue rows carry `sourceType` + `sourceRefId` linking back to the originating batch (the V6.3
  "dynamic revenue hub" requirement).
- Net = `SUM(revenue.amount) - SUM(expense.amount)` — computed in a view or query, never stored stale.

Prisma schema lives in `packages/db/prisma/schema.prisma` (monorepo) or `prisma/schema.prisma` (single app).

---

## 3. Phased Build Plan

### Phase 1 — Foundation & UI Shell  *(~1 sprint)*
- [ ] Scaffold Next.js + TS + Tailwind; configure dark onyx theme with Ravia tokens
      (green `#4BAE4F`, orange `#F58220`, danger `#f44336`, fonts Outfit/Playfair/Pacifico).
- [ ] Build `components/ui` primitives (Button, Card, Modal, Table, Tabs, Toast, ProgressBar, Tag)
      mirroring the current CSS so the look is pixel-faithful.
- [ ] Recreate the sidebar + section/tab navigation shell (responsive collapse < 900px).
- [ ] Set up PWA (manifest + service worker) and a default "offline" notice.
- [ ] Define shared **Zod** schemas for every entity (the future API contract).
- **Exit criteria:** the static shell renders all sections with placeholder data and matches the brand.

### Phase 2 — Backend, DB & Auth  *(~1–2 sprints)*
- [ ] **Provision Neon:** create project, copy the **pooled** `DATABASE_URL` (for runtime) and
      **unpooled** `DATABASE_URL_UNPOOLED` (for `prisma migrate`). Add both to Vercel project env + `.env.local`.
- [ ] Write Prisma schema from §2; `prisma migrate dev` to create tables.
- [ ] **Next.js Route Handlers** under `app/api/*` for Poultry, Vegetables, Rabbitry, Canine, Finance, Auth.
      Validate every request body with **Zod**; enforce numeric coercion (replaces the old class-validator
      `@Type(() => Number)` pattern).
- [ ] **Auth.js Credentials provider:** register/login, session JWT, role guard middleware
      (`Owner | Manager | Farm Hand | Vet`). Seed a demo farm + owner.
- [ ] Replace `localStorage` reads/writes with API calls behind TanStack Query; keep optimistic UI.
- **Exit criteria:** a logged-in user can CRUD every entity and it persists to Neon.

### Phase 3 — Module Parity (port all logic)  *(~2 sprints)*
Port each section's exact behavior, server-side where it touches money or forecasts:
- [ ] **Poultry:** batch deploy (+auto-expense), 84-day maturation, Silverlands vaccine checklist
      (days 0/12/14/21/28/42), egg records + tray conversion (÷30), incubation 21-day.
- [ ] **Vegetables:** unit deploy, `units*84*pricePerStem` cost (+auto-expense), inventory stems.
- [ ] **Rabbitry:** registry (+auto-expense), pairings, 31-day kindling forecast + DUE state.
- [ ] **Canine:** pack registry (+auto-expense), 180-day heat recurrence + alert window (170–180).
- [ ] **Finance:** expense (Feed bag-math vs manual), revenue hub (type→batch dropdown, live total),
      P&L (revenue−expense), transaction history + grand-total, JSON backup export (now server-generated).
- [ ] **Health logs:** disease presets, affected/loss/deaths, treatment, photo upload → R2.
- **Exit criteria:** feature-for-feature parity with the prototype, validated and tested.

### Phase 4 — Intelligence, Alerts & Sync  *(~1 sprint)*
- [ ] Scheduled job scanning due windows → alerts feed + push/email/SMS (Twilio/owner's WhatsApp pattern).
- [ ] Offline outbox: IndexedDB queue of mutations synced on reconnect; conflict handling (last-write per row).
- [ ] Dashboard "alerts" aggregation ported from `renderDashboard()` (vaccine/heat/kindling windows).
- [ ] Reporting: monthly P&L export (CSV/PDF), per-section profitability.
- **Exit criteria:** a farmer gets a "vaccine due tomorrow" notification without opening the app.

### Phase 5 — Scale, Hardening & Polish  *(ongoing)*
- [ ] Multi-farm tenancy (row-level `farmId` scoping already designed in).
- [ ] Roles & permissions UI (Owner/Manager/Hand/Vet).
- [ ] Photo compression + gallery per health event.
- [ ] Mobile QA on low-end Android (the real field device); offline resilience testing.
- [ ] Analytics: trends, breed/crop ROI, mortality rates.
- [ ] CI (GitHub Actions) + preview deployments + error monitoring (Sentry).
- **Exit criteria:** production-ready for multiple farms.

---

## 4. Project Structure (single Next.js app + Neon)

```
ravia-farms-app/
├─ app/
│  ├─ (dashboard)/         # sections: dashboard, poultry, vegetables, rabbitry, canine, finance
│  ├─ api/                 # Route Handlers: /api/poultry, /api/vegetables, ... /api/auth
│  ├─ auth/                # login / register pages
│  └─ layout.tsx           # Ravia theme provider + Auth.js session
├─ components/ui/          # Ravia design-system primitives (Button/Card/Modal/Table/Tabs/Toast)
├─ lib/
│  ├─ db.ts                # Prisma client singleton (Neon pooled URL)
│  ├─ auth.ts              # Auth.js config (Credentials + roles)
│  └─ constants.ts         # domain constants (vaccine days, 84, 30, 180…)
├─ packages/shared/        # Zod schemas + types (shared client/server contract)
├─ prisma/
│  └─ schema.prisma        # Neon Postgres models
├─ public/                 # PWA manifest + service worker (Serwist)
├─ .env.local              # DATABASE_URL (pooled), DATABASE_URL_UNPOOLED, AUTH_SECRET
├─ README.md
└─ ROADMAP.md
```

Single deployable: `vercel --prod` ships the whole app (UI + API + Cron) to Vercel, talking to Neon.

---

## 5. Domain Constants to Centralize

Move these out of hard-coded JS into a shared, farm-overridable config (DB `Farm.settings` or env):

| Constant | Default |
|---|---|
| Eggs per tray | 30 |
| Stems per vertical unit | 84 |
| Poultry maturation | 84 days |
| Silverlands vaccine days | 0, 12, 14, 21, 28, 42 |
| Incubation window | 21 days |
| Rabbit kindling | 31 days (alert 28–31) |
| Canine heat recurrence | 180 days (alert 170–180) |
| Currency / locale | KES / `en-KE` |

---

## 6. Deployment — Neon + Vercel

### One-time setup
1. **Neon:** create a project → copy the connection string. Neon shows two endpoints:
   - **Pooled** (`@pooled.neon.tech`) → use as `DATABASE_URL` in serverless runtime.
   - **Unpooled** (direct) → use as `DATABASE_URL_UNPOOLED` for `prisma migrate`/generate.
2. **Vercel:** import the GitHub repo; framework preset = Next.js. In *Project → Settings → Environment
   Variables* add `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `AUTH_SECRET` (and R2 keys later). These apply to
   Production **and** Preview, so every PR gets a working DB.
3. **Neon ↔ Vercel preview wiring (optional but recommended):** use the Neon Vercel integration so each
   preview deploy creates/branches a Neon database automatically. Otherwise point Previews at a shared dev
   branch.
4. **Cron:** define `vercel.json` with a `cronexpression` hitting `/api/cron/alerts` (daily due-window scan).

### Deploy flow
```bash
# local
cp .env.example .env.local        # fill Neon URLs + AUTH_SECRET
npx prisma generate
npx prisma migrate deploy         # applies schema to Neon (prod branch)
npm run dev

# ship
git push origin main              # Vercel builds + deploys; GitHub Actions runs migrate on prod
vercel --prod                     # or just let git push handle it
```

### Notes
- Prisma in serverless: instantiate the client as a **singleton** (cache on `globalThis`) to avoid
  exhausting connections — and use the **pooled** `DATABASE_URL` at runtime.
- DB migrations: run `prisma migrate deploy` in the Vercel build step (or a post-deploy hook), never
  `migrate dev` in production.
- Object storage: Cloudflare R2 bucket for `health-photos/`; generate presigned PUT URLs from a Route Handler.

### Suggested first commit sequence
1. `chore: scaffold Next.js + Tailwind + Ravia theme`
2. `feat(ui): design-system primitives (Button/Card/Modal/Table/Tabs/Toast)`
3. `feat(db): Prisma schema + Neon Postgres`
4. `feat(auth): login/register + guards`
5. `feat(poultry): batches, eggs, incubation, health`
6. `feat(vegetables): units + health`
7. `feat(rabbitry): registry + pairings`
8. `feat(canine): pack + heat cycles`
9. `feat(finance): expenses, revenue hub, P&L`
10. `feat(alerts): scheduled due-window notifications`
11. `feat(pwa): offline outbox + sync`

---

## 7. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Farmers lose data on device change | Server persistence + backup export from day one of Phase 2. |
| Bad connectivity in fields | PWA + IndexedDB outbox (Phase 4); never block UI on network. |
| Photo storage bloat | Compress client-side; store in R2, not DB. |
| Domain rules drift between UI and API | Single source of truth in `packages/shared` constants + server-computed values. |
| Money bugs | Finance ledger is append-only; amounts derived, never hand-edited. |

---

## 8. Definition of Done (MVP)

A farm owner can: open Ravia Farms on their phone (even offline), deploy a poultry batch / veg unit /
rabbit / dog and see the expense auto-post, log eggs/health/breeding events, record revenue linked to a
batch, view live net profit in KES, get a "due soon" alert, and export a backup — all with data safely
stored in the cloud and synced across their devices.
