# Ravia Farms — Precision Farm Management

> **ROOTED AND NOURISHED**

Ravia Farms is a precision agricultural management application (ERP-lite) built for a mixed smallholder
farm in Kenya. It tracks four production verticals — **poultry, vertical vegetables, rabbitry, and
canine breeding** — and ties every operational action back to a single **profit-and-loss engine** so the
farmer always knows whether the farm is profitable, by how much (in KES), and what needs attention today.

This repository contains the **full-stack application**: a Next.js 14 (App Router) frontend backed by
Supabase — Postgres with row-level security, Auth, Storage, and Deno Edge Functions. It ships as an
installable PWA so it keeps working on a phone with patchy connectivity in the field.

> The original single-file `index.html` prototype that Phase 1 was built from has been removed. It served
> its purpose — bringing the UI to life — and was frozen at the first commit, so keeping it around only
> invited confusion about which surface was live. Its history is still in git if you need it.

---

## Table of Contents

- [What Problem It Solves](#what-problem-it-solves)
- [Target Users & Use Cases](#target-users--use-cases)
- [Feature Reference](#feature-reference)
  - [Dashboard](#1-dashboard)
  - [Poultry Hub](#2-poultry-hub)
  - [Vertical Garden](#3-vertical-garden)
  - [Rabbitry](#4-rabbitry)
  - [Canine Breeding](#5-canine-breeding)
  - [Finance Hub](#6-finance-hub)
- [Core Data Model](#core-data-model)
- [Domain Rules (Hard-Coded Business Logic)](#domain-rules-hard-coded-business-logic)
- [Design System](#design-system)
- [Current Architecture](#current-architecture)
- [Getting Started](#getting-started)
- [Data & Privacy Notes](#data--privacy-notes)
- [Roadmap](#roadmap)
- [Tech Stack Recommendation](#tech-stack-recommendation)
- [Contributing](#contributing)

---

## What Problem It Solves

Small mixed farms generate a lot of scattered, perishable information:

- *"Which broiler batch is due for its Gumboro vaccine this week?"*
- *"How many trays of eggs did we collect today, and what's the running feed bill?"*
- *"The doe was paired 28 days ago — is kindling expected?"*
- *"After this vegetable unit sells, are we actually in profit this month?"*

Spreadsheets and notebooks lose this context. Ravia Farms centralizes it: every animal/crop batch, every
health incident, and every shilling in or out is recorded once and immediately reflected in dashboards,
forecasts, and the bottom line. The defining design principle is **operational logging auto-posts to
finance** — deploying a batch isn't just a record, it's an expense; selling from a batch isn't just a note,
it's revenue tied back to that batch.

---

## Target Users & Use Cases

| Persona | Primary Need | How Ravia Farms Helps |
|---|---|---|
| **Owner / Manager** | Whole-farm financial visibility | Finance Hub P&L, net profit and margin in KES, per-sector breakdowns, dashboard alerts. |
| **Farm Hand (field)** | Quick logging while working | Mobile-friendly modals, camera capture for health proof, tap-to-log eggs/incidents. |
| **Breeder** | Reproduction cycle tracking | Rabbit kindling forecast (31-day), canine heat-cycle recurrence (180-day). |
| **Vet / Health lead** | Disease & mortality oversight | Per-section health logs, symptom/visual-ID links, photo evidence. |
| **(Future) Multi-farm / Co-op** | Shared, audited records | Cloud backend, roles, multi-tenant farms (roadmap). |

**Intended environment:** a phone or tablet in the field (often with patchy connectivity) plus a desktop
for analysis. This is why the app ships as a Progressive Web App with a service worker and an offline
banner, rather than assuming a live connection.

---

## Feature Reference

### 1. Dashboard
- **Livestock overview:** four stat cards counting what is on the farm right now — poultry birds on hand
  (plus batches and eggs collected today), rabbits (does / bucks), dogs (bitches / dogs), and vegetable
  stems (across N units). Each card taps through to its section.
- **Recent Tasks & Alerts feed:** auto-generated from batch ages and breeding cycles
  (vaccination windows, kindling due, repeat heat cycles).
- **No financial figures.** Money lives in the Finance Hub; the dashboard answers *what is on the farm*,
  not *what did it earn*.

### 2. Poultry Hub
- **Species Deployed:** flock composition by breed — birds on hand, share of the flock, and the
  deployed / mortality / sold figures behind each bar. Breeds at zero still show, so the card answers
  "are we running any Broilers?" as readily as "how many Sasso?".
- **Batch deployment:** name/ID, breed (Sasso / Kienyeji / Layers / Broilers), supplier, bird count,
  unit price, deploy date. Deploying a batch **auto-logs the purchase as an expense**.
- **Maturation tracker:** 84-day cycle progress bar per batch.
- **Silverlands vaccination schedule:** a fixed 6-point plan (days 0, 12, 14, 21, 28, 42) rendered as a
  checklist that flips to "done" as the batch ages; due windows surface as dashboard alerts.
- **Layers & Eggs:** egg-collection counter with tray conversion (30 eggs = 1 tray).
- **Incubation:** egg-set cycles tracked on a 21-day hatch window.
- **Health & Mortality log:** batch, disease/condition (preset list + "Other"), affected count, deaths,
  treatment, photo proof, and quick links to Google symptom search / Google Lens.

### 3. Vertical Garden
- **Unit deployment:** crop type (Sukuma Wiki / Spinach / Managu / Kienyeji Mix), supplier, vertical
  units, price-per-stem. Cost is computed as **units × 84 stems × price/stem** and logged as an expense.
- **Inventory:** live count of units and total stems.
- **Crop protection & loss log:** pest/disease presets (Downy Mildew, Aphids, Bacterial Wilt, Early Blight,
  Spider Mites), affected units, dead-unit loss, action taken, photo proof.

### 4. Rabbitry
- **Breed registry:** tag ID/name, breed, sex (Doe/Buck), source, purchase price. Registration auto-logs
  the purchase expense.
- **Pairings:** doe × buck with date; kindling forecast computed on a **31-day** gestation window, with a
  "DUE" alert state as the date approaches.
- Registry and pairing tables are fully editable/removable.

### 5. Canine Breeding
- **Pack registry:** name, breed, sex (Bitch/Dog), source, price, pedigree detail (e.g. KCP Certified).
  Registration auto-logs the purchase expense.
- **Heat-cycle monitoring:** log heat events per female; system projects the **next cycle at ~180 days**
  and flags recurrence due within a 170–180 day window.

### 6. Finance Hub
- **Expense logging:** category (Feed / Initial Stock / Medical / Labor / Equipment). Selecting *Feed*
  reveals bag-qty × price-per-bag math; other categories take a manual total.
- **Revenue logging (V6.3 dynamic hub):** choose a source *type* (Poultry / Vegetables / Rabbitry /
  Canine / Other); the *Source Batch/Item* dropdown auto-aggregates live batch names from that sector;
  quantity × unit price computes total revenue in real time.
- **Profit & Loss tab:** Revenue, Expenses, Net and **Net Margin**, plus a per-sector table putting
  revenue against expenses with a margin column. A sector that has spent but never sold shows `—`, not
  `0%` — there is no denominator, which is a different fact from breaking even. The tab always reads the
  live books and is unaffected by the archive toggle on the Transactions tab.
- **P&L engine:** Total Revenue − Total Expenses = Net Cash Flow, with color-coded profit/loss.
- **Transaction history:** date, type, category, human-readable breakdown
  (`[Qty] [unit] @ [Price] = [Total]`), amount, archive. Grand-total expense footer row.
- **Inputs & Stock / Purchases / Usage Log:** input catalog with computed stock balances, purchase
  history (each auto-posting an expense), and consumption logging.
- **Backup:** one-click JSON export of the whole farm, generated server-side.

---

## Core Data Model

Everything lives in Postgres, defined by the migrations in [`supabase/migrations/`](./supabase/migrations/)
and scoped to a **farm** with row-level security:

```
farms ──┬─ users                (farm_id, role: OWNER | MANAGER | FARM_HAND | VET)
        ├─ poultry_batches      ── poultry_health, egg_records, incubations
        ├─ vegetable_units      ── vegetable_health
        ├─ rabbits              ── rabbit_pairings
        ├─ dogs                 ── dog_heats
        ├─ input_items          ── input_purchases, input_usage
        ├─ sales
        └─ finance_transactions (type, category, amount, source_type, source_ref_id)
```

Two invariants worth knowing before you touch the schema:

- **Nothing is ever hard-deleted.** Every table carries `archived_at`; "delete" sets it. The archive
  filter is *exclusive* — asking for archived rows returns only those, never a union.
- **Balances are computed, never stored.** `poultry_stock`, `vegetable_stock`, `egg_stock` and
  `input_stock` are `security_invoker` views deriving on-hand from deploys minus mortality minus sales.
  A batch's `count` is its deploy number and never moves.

---

## Domain Rules (Hard-Coded Business Logic)

These constants live in [`lib/constants.ts`](./lib/constants.ts) and should be made configurable per farm
rather than re-hardcoded elsewhere:

| Rule | Value | Constant |
|---|---|---|
| Eggs per tray | 30 | `EGGS_PER_TRAY` |
| Stems per vertical unit | 84 | `STEMS_PER_UNIT` |
| Poultry maturation cycle | 84 days | `POULTRY_MATURATION_DAYS` |
| Poultry breeds | Sasso / Kienyeji / Layers / Broilers | `POULTRY_BREEDS` |
| Silverlands vaccine days | 0, 12, 14, 21, 28, 42 | `SILVERLANDS_VAC` |
| Incubation window | 21 days | `INCUBATION_DAYS` |
| Rabbit kindling | 31 days (alert 28–31) | `RABBIT_KINDLING_DAYS` / `_ALERT` |
| Canine heat recurrence | 180 days (alert 170–180) | `CANINE_HEAT_DAYS` / `_ALERT` |
| Currency / locale | KES / `en-KE` | `CURRENCY` / `LOCALE` |

> `POULTRY_BREEDS` is mirrored by a Zod enum in `supabase/functions/_shared/schemas.ts`. Edge Functions
> do not share the client bundle, so the two copies are kept in step by hand — change both.

---

## Design System

- **Theme:** Onyx/black (`#000` body, `#121212` cards, `#080808` sidebar).
- **Brand colors:** Vibrant Green `#4BAE4F` (success / revenue / primary), Deep Orange `#F58220`
  (accent / warnings / breakdowns). Danger red `#f44336` for loss/expense/mortality.
- **Fonts:** *Outfit* (UI), *Playfair Display* (headings), *Pacifico* (logo). Loaded from Google Fonts.
- **Icons:** Font Awesome 6.4.0.
- **Layout:** fixed 260px sidebar (collapses to 70px icon-rail under 900px) + scrollable main area;
  responsive grid stat cards; modal-driven CRUD; toast confirmations.
- The full-stack UI should preserve this exact visual identity (it is the brand).

---

## Current Architecture

```
┌──────────────────────────────────────────────────────┐
│  Next.js 14 App Router (React 18, TS strict, Tailwind) │
│  ├─ middleware.ts            auth gate                 │
│  ├─ DashboardShell           sidebar + section switch   │
│  ├─ components/sections/*    one view per sector        │
│  ├─ components/ui/*          hand-rolled primitives     │
│  └─ TanStack Query           cache + invalidation       │
└──────────────────────────────────────────────────────┘
         │  lib/api-client.ts  (fetch wrapper)
         ▼
┌──────────────────────────────────────────────────────┐
│  Supabase Edge Functions (Deno) — one per resource     │
│  Zod validation, farm scoping, atomic deploy RPCs      │
└──────────────────────────────────────────────────────┘
         ▼
   Postgres + RLS · Auth · Storage (health photos)
```

- **Routing quirk:** there are only three real routes. `app/(dashboard)/page.tsx` renders nothing —
  `DashboardShell` switches sections by `useState`, so **adding a section means adding a `SectionId`, not
  a route file**: `lib/constants.ts`, `components/layout/sidebar.tsx`, and the switch in
  `components/sections/dashboard-section.tsx`.
- **Writes go through Edge Functions**, never straight to the table, so validation and the auto-expense
  pairing stay server-side. Deploying a batch and booking its expense is one atomic RPC.
- **Two reads bypass this** and hit RLS views directly: `useProfile` and `useEggStock`.
- **No chart or map library.** Visuals are hand-rolled from `ProgressBar` and Tailwind; keep it that way
  unless a dependency genuinely earns its bundle cost.

---

## Getting Started

```bash
npm install
cp .env.example .env.local     # fill in your Supabase URL + anon key
npm run dev                    # http://localhost:3000
```

Useful checks:

```bash
npx tsc --noEmit               # strict typecheck
npm run build                  # production build
```

**Sign in** with the seeded owner from [`supabase/seed.sql`](./supabase/seed.sql) —
`owner@ravia.farm` / `ravia1234`. The seed creates a user and a farm and **no livestock or transactions**,
so a fresh database shows zeros everywhere until you deploy a batch and log something.

> **Not seeing your changes in `npm run dev`?** The service worker in `public/sw.js` is cache-first for
> static assets under a fixed cache name, and dev chunk filenames are stable, so it can keep serving a
> stale bundle. Fix: DevTools → Application → Service Workers → *Unregister*, then hard-reload. Bump the
> `CACHE` constant if you change the shell.

---

## Data & Privacy Notes

- Farm data lives in Supabase Postgres and is isolated per farm by row-level security. A user only ever
  sees rows for the farm their profile points at.
- Health "proof" photos go to Supabase Storage; the row keeps a `photo_url`.
- Nothing is hard-deleted, so an archived record remains recoverable and auditable. Treat archiving as
  the delete affordance in the UI.

---

## Roadmap

The phased plan that took this from prototype to production — with data-model migration and deployment —
lives in **[`ROADMAP.md`](./ROADMAP.md)**. Phases 1–3 are done; the prototype it started from is gone.

High-level phases:

1. **Foundation** — monorepo, design-system components, typed data model, PWA shell.
2. **Backend & persistence** — API + relational DB, auth, replace `localStorage` with a real store.
3. **Module parity** — port every section's logic server-side; keep auto-expense + P&L engine.
4. **Intelligence & alerts** — scheduled jobs for vaccination/heat/kindling reminders, notifications.
5. **Scale** — multi-farm tenancy, roles, reporting/exports, mobile hardening, analytics.

---

## Tech Stack

What is actually built. (`ROADMAP.md` records an earlier *recommendation* — Neon + Prisma + Auth.js +
shadcn/ui — that was **not** the route taken. Supabase replaced it; read that section as history.)

- **App:** Next.js 14 (App Router) + React 18 + TypeScript strict + Tailwind CSS, shipped as a **PWA**.
- **UI:** hand-rolled primitives in `components/ui/` — no component library. Font Awesome via CDN.
- **Data:** Supabase Postgres with row-level security. Migrations in `supabase/migrations/`.
- **Server logic:** Supabase **Edge Functions** (Deno), one per resource, Zod-validated, with plpgsql
  RPCs for anything that must be atomic (deploy + expense, sale + stock reconciliation).
- **Client cache:** TanStack Query v5 (`staleTime` 30s), invalidated per mutation.
- **Auth:** Supabase Auth behind `middleware.ts`, with roles (Owner / Manager / Farm Hand / Vet).
- **Files:** Supabase Storage for health photos.

---

## Contributing

- Keep the **Ravia brand colors and fonts** intact.
- Preserve the **domain constants** (vaccine days, 84-day cycles, 30 eggs/tray, KES) — they are farm
  operating procedure, not arbitrary UI choices.
- New financial actions must **auto-post to the P&L engine**, matching the existing deploy→expense pattern,
  and must be atomic — pair the stock row and its transaction in one RPC, never two calls.
- Reuse the primitives in `components/ui/` and the modal + toast patterns already established there.
- Run `npx tsc --noEmit` before opening a PR.

See [`ROADMAP.md`](./ROADMAP.md) before building new backend functionality.
