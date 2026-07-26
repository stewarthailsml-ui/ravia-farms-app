# Ravia Farms — Precision Farm Management

> **ROOTED AND NOURISHED**

Ravia Farms is a precision agricultural management application (ERP-lite) built for a mixed smallholder
farm in Kenya. It tracks four production verticals — **poultry, vertical vegetables, rabbitry, and
canine breeding** — and ties every operational action back to a single **profit-and-loss engine** so the
farmer always knows whether the farm is profitable, by how much (in KES), and what needs attention today.

This repository currently contains the **frontend prototype** (`index.html`): a self-contained, offline-capable
single-page app that persists all data to the browser's `localStorage`. The long-term goal is to evolve it
into a multi-user, cloud-backed full-stack product (see [`ROADMAP.md`](./ROADMAP.md)).

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
- [Getting Started (Run the Prototype)](#getting-started-run-the-prototype)
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
| **Owner / Manager** | Whole-farm financial visibility | Dashboard P&L, net profit in KES, section-level breakdowns, alerts. |
| **Farm Hand (field)** | Quick logging while working | Mobile-friendly modals, camera capture for health proof, tap-to-log eggs/incidents. |
| **Breeder** | Reproduction cycle tracking | Rabbit kindling forecast (31-day), canine heat-cycle recurrence (180-day). |
| **Vet / Health lead** | Disease & mortality oversight | Per-section health logs, symptom/visual-ID links, photo evidence. |
| **(Future) Multi-farm / Co-op** | Shared, audited records | Cloud backend, roles, multi-tenant farms (roadmap). |

**Intended environment:** a phone or tablet in the field (often with patchy connectivity) plus a desktop
for analysis. This is why the prototype is offline-first via `localStorage`. The full-stack version keeps
that resilience through a Progressive Web App (PWA) with sync.

---

## Feature Reference

### 1. Dashboard
- **Stat cards:** Eggs collected today (+ tray conversion), active vegetable stems, net profit (KES).
- **Recent Tasks & Alerts feed:** auto-generated from batch ages and breeding cycles
  (vaccination windows, kindling due, repeat heat cycles).
- **P&L Overview:** Revenue / Expenses / Net, one tap from the dashboard into the Finance Hub.

### 2. Poultry Hub
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
- **P&L engine:** Total Revenue − Total Expenses = Net Cash Flow, with color-coded profit/loss.
- **Transaction history:** date, type, category, human-readable breakdown
  (`[Qty] [unit] @ [Price] = [Total]`), amount, delete. Grand-total expense footer row.
- **Backup:** one-click JSON export of the entire state.

---

## Core Data Model

The prototype keeps everything in a single `state` object (localStorage key `raviaFarmsV6_2`):

```
state = {
  sassoBatches:  [{ name, source, date, qty, unitPrice, breed, count }]
  layersEggs:    [{ count, date }]
  incubation:    [{ count, date }]
  poultryHealth: [{ date, batch, issue, affected, mortality, rx, photo? }]
  vegBatches:    [{ type, source, date, units, pricePerStem, stems }]
  vegHealth:     [{ date, batch, issue, affected, loss, rx, photo? }]
  rabbits:       [{ name, source, date, price, breed, sex }]
  pairings:      [{ doe, buck, date }]
  dogs:          [{ name, source, price, breed, sex, pedigree }]
  heats:         [{ name, date }]
  finance:       [{ type, cat, desc, qty, unitPrice, amount, date, unitLabel }]
}
```

This flat, array-based shape is the natural seed for a normalized relational schema
(see ROADMAP → *Data Model Migration*).

---

## Domain Rules (Hard-Coded Business Logic)

These constants live in the prototype and must be preserved (and later made configurable) in the full-stack build:

| Rule | Value | Location |
|---|---|---|
| Eggs per tray | 30 | `renderDashboard()` |
| Stems per vertical unit | 84 | `calculateVegDeployment()` |
| Poultry maturation cycle | 84 days | `renderPoultry()` |
| Silverlands vaccine days | 0, 12, 14, 21, 28, 42 | `SILVERLANDS_VAC` |
| Incubation window | 21 days | `renderPoultry()` |
| Rabbit kindling | 31 days (alert 28–31) | `renderRabbits()` |
| Canine heat recurrence | 180 days (alert 170–180) | `renderDogs()` |
| Currency / locale | KES / `en-KE` | throughout |

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
┌─────────────────────────────────────────────┐
│  Browser (single index.html)                 │
│  ├─ HTML structure (sidebar + sections)       │
│  ├─ CSS (design system, all inline <style>)   │
│  └─ Vanilla JS                                │
│       ├─ state object (in-memory)             │
│       ├─ localStorage persistence             │
│       ├─ render*() functions (DOM updates)    │
│       └─ form handlers (CRUD + auto-expense)  │
└─────────────────────────────────────────────┘
         │
         └─ persists to: localStorage["raviaFarmsV6_2"]
```

- **No backend, no network, no accounts.** Single user, single device, single farm.
- **Persistence:** `localStorage` JSON blob. Export = download JSON.
- **Limitations:** data is trapped on one browser/device, no sharing, no backups beyond manual export,
  no validation/server authority, no multi-user, no real photos stored (only base64 previews in memory).

---

## Getting Started (Run the Prototype)

No build step required — it is a static file.

```bash
# Option A: just open it
open index.html                # macOS
xdg-open index.html            # Linux
start index.html               # Windows (PowerShell)

# Option B: serve it (recommended, avoids file:// quirks)
# from the project root:
python3 -m http.server 5173    # then visit http://localhost:5173
# or
npx serve .
```

**First run:** the app initializes an empty `state`, defaults all date fields to today, and renders the
dashboard. Use the colored **DEPLOY / REGISTER / LOG** buttons to add data; everything auto-saves to
`localStorage`. Use **Backup** (top-right of Dashboard) to export a JSON snapshot.

> To inspect/reset data: DevTools → Application → Local Storage → key `raviaFarmsV6_2`. Delete the key to reset.

---

## Data & Privacy Notes

- All prototype data stays on the user's device. Nothing is transmitted.
- Photo "proof" is read as a base64 data URL and is **not** currently persisted (it lives only in the
  open modal preview). The full-stack version must move photos to object storage.
- The embedded `<script type="application/x-goose-prd">` block is the original product-requirements
  document (PRD) for V6.3 and is kept in-file for reference.

---

## Roadmap

The full plan to turn this prototype into a production full-stack product — phased, with the recommended
tech stack, data-model migration, and deployment — lives in **[`ROADMAP.md`](./ROADMAP.md)**.

High-level phases:

1. **Foundation** — monorepo, design-system components, typed data model, PWA shell.
2. **Backend & persistence** — API + relational DB, auth, replace `localStorage` with a real store.
3. **Module parity** — port every section's logic server-side; keep auto-expense + P&L engine.
4. **Intelligence & alerts** — scheduled jobs for vaccination/heat/kindling reminders, notifications.
5. **Scale** — multi-farm tenancy, roles, reporting/exports, mobile hardening, analytics.

---

## Tech Stack Recommendation

**Chosen: Neon (serverless Postgres) + Vercel (Next.js), single deploy.** Full rationale and versioned
choices are in [`ROADMAP.md`](./ROADMAP.md) → *Tech Stack*. Summary:

- **App:** Next.js (App Router, TypeScript) + Tailwind CSS + shadcn/ui, shipped as a **PWA** for offline
  field use. Preserves the exact Ravia visual identity. UI + API + Cron in one Vercel project.
- **Data:** Prisma ORM → **Neon Postgres** (serverless, scales to zero, branches per preview deploy).
- **Server logic:** Next.js Route Handlers + Server Actions (Zod-validated) — no separate API service.
- **Auth:** Auth.js (NextAuth) Credentials provider with role guards (Owner / Manager / Farm Hand / Vet).
- **Files:** S3-compatible object storage (Cloudflare R2 / AWS S3) for health photos, via presigned URLs.
- **Deploy:** Vercel only — frontend, API, and cron in one place; Neon as the database.

---

## Contributing

This is an early-stage prototype. When contributing:

- Keep the **Ravia brand colors and fonts** intact.
- Preserve the **domain constants** (vaccine days, 84-day cycles, 30 eggs/tray, KES) — they are farm
  operating procedure, not arbitrary UI choices.
- New financial actions must **auto-post to the P&L engine**, matching the existing deploy→expense pattern.
- Prefer the modal + toast interaction patterns already established in `index.html`.

See [`ROADMAP.md`](./ROADMAP.md) before building new backend functionality.
