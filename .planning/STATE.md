# STATE — Ravia Farms (last updated: full spec-parity pass, Supabase architecture)

## Status by phase
- [x] **Phase 1 — Foundation & UI Shell**: COMPLETE.
- [x] **Phase 2 — Backend, DB & Auth**: COMPLETE, but on a **different stack than originally
      documented below** — see "Architecture change" first.
- [x] **Phase 3 — Module Parity + Roles/Archive**: COMPLETE. All 12 spec modals wired, every
      button functional, full CRUD across all 12 entities, admin/staff role model enforced in
      RLS, archive-not-delete, staff invite flow.

## Architecture change (supersedes the Prisma/Neon/NextAuth section below)
The backend was rebuilt on **Supabase** (Postgres + Auth + Edge Functions + Storage), replacing
the originally-planned Prisma/Neon/Auth.js stack. `prisma/schema.prisma`, `lib/db.ts`, `lib/api.ts`,
`app/api/**/route.ts`, and `app/api/auth/[...nextauth]/route.ts` were all removed. The rest of
this file describes the **Supabase** architecture as it now stands.

## Data model & auth
- `supabase/migrations/20240101000000_initial_schema.sql` — 12 entity tables (poultry_batches,
  egg_records, incubations, poultry_health, vegetable_units, vegetable_health, rabbits,
  rabbit_pairings, dogs, dog_heats, finance_transactions, users) + farms, all farm-scoped via
  `farm_id` and a `public.farm_id()` helper.
- `supabase/migrations/20240101000001_roles_and_provisioning.sql` — role vocabulary
  (`OWNER | MANAGER | FARM_HAND | VET`, CHECK-constrained), `public.is_admin()` helper, RLS on
  `farms` (previously missing), and the `handle_new_user` trigger that provisions a farm + profile
  on signup — branching on invite metadata (`farm_id`/`role`) so an invited staff member joins the
  inviter's farm instead of getting their own.
- `supabase/migrations/20240101000002_archive_and_rls.sql` — **records are permanent.** Every
  entity table gets `archived_at timestamptz`; DELETE is revoked at the grant level and no DELETE
  policy exists anywhere, so nothing is destructible via the API. "Archive" is an UPDATE that
  stamps `archived_at`, gated to admins only via per-command RLS policies (staff get a live-rows-only
  UPDATE policy whose `WITH CHECK` blocks them from setting `archived_at`; admins get a second,
  unrestricted UPDATE policy). Staff can create and edit; only OWNER/MANAGER can archive, view
  archived records, or manage staff. See `supabase/functions/_shared/auth.ts` for the matching
  Edge Function guards (`requireAdmin`, `wantsArchived`).
- `supabase/migrations/20240101000003_health_photos_storage.sql` — public-read `health-photos`
  Storage bucket, farm-scoped upload policy, admin-only manage policy.
- `supabase/seed.sql` — creates the demo owner (`owner@ravia.farm` / `ravia1234`) by inserting into
  `auth.users` directly, exercising the same provisioning trigger a real signup would.

## Edge Functions (`supabase/functions/`)
One function per resource — `poultry`, `vegetables`, `rabbits`, `dogs`, `finance`, `eggs`,
`incubations`, `poultry-health`, `vegetable-health`, `rabbit-pairings`, `dog-heats`, `staff`.
Shared code lives in `supabase/functions/_shared/` (`auth.ts` for the request-scoped
JWT-bound Supabase client + CORS + archive helpers, `schemas.ts` for the canonical Zod schemas —
`lib/schemas.ts` re-exports these for the Next.js side). `staff` is the one function that also
constructs a service-role client, used only for `auth.admin.inviteUserByEmail`.

## Frontend
- `components/sections/use-ravia-data.ts` — TanStack Query hooks for every entity (list + create +
  archive), plus `useProfile()` (role/isAdmin, queried directly via RLS — no Edge Function needed
  for "who am I") and the `staff` management hooks.
- `components/sections/modals/*.tsx` — all 12 spec modals (deploy/register/log forms), validated
  against the shared Zod schemas, with the live calc previews (veg stems/cost, revenue total) and
  the dynamic revenue Source-Batch dropdown.
- Every list row's Archive/X control is `components/ui/archive-button.tsx` (renders nothing for
  staff); `components/ui/archived-toggle.tsx` gives admins an "Include archived" view per section.
- `components/sections/staff-view.tsx` — admin-only Staff section (invite, role change,
  deactivate); gated in the sidebar via `useProfile().isAdmin`.
- Dashboard alert engine is real (vaccine ±1 day, kindling 28–31, heat 170–180), not the old
  hardcoded placeholder entry.

## Routing / auth
- `/auth/signin` and `/auth/set-password` live **outside** the `app/(dashboard)/` route group, so
  they render full-page. (Previously `DashboardShell` wrapped every route unconditionally and
  ignored its own `children` prop, so sign-in's output was rendered but immediately discarded —
  the dashboard shell rendered on top of it regardless of route.)
- `middleware.ts` gates unauthenticated requests to `/auth/signin` (via `getUser()`, which
  revalidates against Supabase Auth rather than trusting the session cookie) and bounces
  authenticated users away from `/auth/signin` specifically — not from `/auth/set-password`, since
  an invite link authenticates the user precisely so they can reach that page.

## Known follow-ups (not done in this pass)
- `lib/database.types.ts` is a stale generated-types file, not wired into either Supabase client
  (`lib/supabase/client.ts` / `server.ts` don't use the `Database` generic) and not imported
  anywhere. Regenerate via `supabase gen types typescript` after running the new migrations
  locally, then type the two client factories with it.
- The "Include archived" toggle covers each section's primary list (poultry batches, vegetable
  units, rabbits, dogs, finance transactions). The secondary sub-lists (health logs, pairings,
  heats) don't have it yet — same backend support (`?archived=true`) exists if extended later.

## Env / platform notes
Owner: Arnold Adero. A `.kilo/` directory is present in this repo (another AI coding tool's
workspace) — during this pass, files were observed changing on disk outside this session's own
edits (e.g. `middleware.ts` appeared mid-session with a bug this pass then fixed). Worth confirming
with the owner whether another agent/tool is concurrently active on this repo before assuming any
one session's view of the tree is authoritative.
