-- Ravia Farms — per-batch vaccination records.
--
-- Until now the Silverlands schedule was a client-side constant: a chip showed
-- "done" whenever the batch was old enough (age >= day), which is an assertion
-- about the calendar, not about the birds. A vaccine that was never given
-- displayed as complete, and the dashboard alert only fired inside a ±1-day
-- window, so a missed dose silently vanished instead of going overdue.
--
-- This table makes administration an event, not an inference: one row per
-- (batch, schedule point). The Silverlands schedule itself stays a constant —
-- it is the farm's operating procedure and identical for every batch; what is
-- recorded here is whether/when each point was actually carried out.
--
-- batch_id is nullable to mirror poultry_health (a "Layers (General)" incident
-- has no batch row), but vaccinations are always per-batch in practice.

create table batch_vaccinations (
  id text primary key default gen_random_uuid()::text,
  farm_id text not null references farms(id) on delete cascade,
  batch_id text references poultry_batches(id) on delete cascade,
  -- Which point of the schedule this is. Keyed on the schedule's `day`, not the
  -- task string: the task label may be reworded later without orphaning rows,
  -- and (batch_id, sched_day) unique keeps one record per point.
  sched_day integer not null check (sched_day >= 0),
  task text not null,
  given_at date not null,
  notes text,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (farm_id, batch_id, sched_day)
);
create index idx_batch_vaccinations_farm_id on batch_vaccinations(farm_id);
create index idx_batch_vaccinations_batch_id on batch_vaccinations(batch_id);

alter table batch_vaccinations enable row level security;

-- Same four-policy shape as every other operational table: farm-scoped select
-- (staff see live rows), insert with no pre-archived rows... except this table
-- has no archived_at at all. Vaccination records are facts about what was done;
-- there is no "archive" workflow around them (a mis-recorded dose is corrected
-- by recording the real one — the duplicate key blocks double-entry). So:
-- select + insert only, no update, no delete, matching the archive-not-delete
-- model by simply having nothing to archive.

create policy batch_vaccinations_select on batch_vaccinations
  for select using (farm_id = public.farm_id());

create policy batch_vaccinations_insert on batch_vaccinations
  for insert with check (farm_id = public.farm_id());

-- New tables are not auto-exposed through PostgREST: RLS narrows access, it
-- does not grant it (see 20240101000006).
grant select, insert on batch_vaccinations to authenticated;

-- created_by stamps the worker who administered it; readable via join when
-- needed, not exposed through any endpoint yet.
