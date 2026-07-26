# Ravia Farms — Project Vision

**Product:** Precision agricultural management ERP for a mixed Kenyan farm (poultry, vertical
vegetables, rabbitry, canine breeding) with a unified profit-and-loss engine in KES.

**Core principle:** Operational logging auto-posts to finance (deploy/register = expense; sell = batch-linked
revenue). The P&L engine is the source of truth.

**Current state:** A single-file `index.html` prototype (localStorage) was the starting point. It now lives
in `prototype/index.html`. We are rebuilding as a full-stack Next.js + Neon + Vercel app.

**Target stack:** Next.js (App Router, TS) + Tailwind + shadcn-style primitives, Prisma → Neon Postgres,
Auth.js (Credentials) with roles, Route Handlers + Zod, TanStack Query, PWA (manual SW) for offline field use.

**Roadmap:** See root `ROADMAP.md` (5 phases: Foundation → Backend/DB/Auth → Module Parity → Alerts/Sync → Scale).

**Key constraints (sacred domain constants):** 84-day poultry cycle, 84 stems/unit, 30 eggs/tray, Silverlands
vaccine days (0/12/14/21/28/42), 21-day incubation, 31-day kindling, 180-day canine heat, KES/en-KE.

**Deploy:** Vercel (frontend + API + Cron) with Neon as the database. Preview DBs via Neon branches.
