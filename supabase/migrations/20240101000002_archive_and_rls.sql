-- Ravia Farms — archive-not-delete, enforced in RLS (not just the API layer).
--
-- Model: records are permanent. "Archive" is an UPDATE that stamps archived_at;
-- there is no DELETE path anywhere. Staff (FARM_HAND, VET) can create and edit
-- live records but cannot archive or see archived ones. Admins (OWNER, MANAGER)
-- can do both, and can see archived records.
--
-- This has to live in RLS, not just in the Edge Functions: PostgREST is reachable
-- directly with the anon/authenticated key, so an Edge-Function-only guard would
-- be bypassable by calling the REST API straight.

-- ---------------------------------------------------------------------------
-- 1. archived_at on every operational table (+ users, for staff deactivation).
--    Deliberately NOT added to `farms` — a farm itself isn't archived this way.
-- ---------------------------------------------------------------------------
alter table users add column archived_at timestamptz;
alter table poultry_batches add column archived_at timestamptz;
alter table egg_records add column archived_at timestamptz;
alter table incubations add column archived_at timestamptz;
alter table poultry_health add column archived_at timestamptz;
alter table vegetable_units add column archived_at timestamptz;
alter table vegetable_health add column archived_at timestamptz;
alter table rabbits add column archived_at timestamptz;
alter table rabbit_pairings add column archived_at timestamptz;
alter table dogs add column archived_at timestamptz;
alter table dog_heats add column archived_at timestamptz;
alter table finance_transactions add column archived_at timestamptz;

-- Now that `users.archived_at` exists, extend is_admin() (defined in the prior
-- migration without this check, since the column didn't exist yet) so a
-- deactivated admin's own account stops counting as an admin anywhere.
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from users
    where id = auth.uid()
      and role in ('OWNER', 'MANAGER')
      and archived_at is null
  );
$$ language sql security definer stable;

-- ---------------------------------------------------------------------------
-- 2. Nothing is ever deletable, for any role, at the privilege level — below
--    and beneath any RLS policy. There is intentionally no DELETE policy either.
-- ---------------------------------------------------------------------------
revoke delete on
  users, poultry_batches, egg_records, incubations, poultry_health,
  vegetable_units, vegetable_health, rabbits, rabbit_pairings, dogs, dog_heats,
  finance_transactions
from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Replace the blanket `for all` policy on each operational table with the
--    per-command set below. Written once as a loop (11 tables, identical shape)
--    instead of ~45 near-duplicate `create policy` statements.
--
--    SELECT   — staff see only live rows; admins see everything in their farm
--               (the Edge Function's own ?archived=true admin gate is UX/shape,
--               this is the actual boundary).
--    INSERT   — any farm member (both tiers) may create records, and cannot
--               insert a pre-archived row.
--    UPDATE   — two OR'd policies: staff may edit live rows but the WITH CHECK
--               blocks them from setting archived_at (i.e. from archiving);
--               admins may update any row in their farm, live or archived,
--               which is what lets an admin's archive UPDATE succeed.
--    DELETE   — no policy, and see (2) above.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  tables text[] := array[
    'poultry_batches', 'egg_records', 'incubations', 'poultry_health',
    'vegetable_units', 'vegetable_health', 'rabbits', 'rabbit_pairings',
    'dogs', 'dog_heats', 'finance_transactions'
  ];
begin
  foreach t in array tables loop
    execute format('drop policy if exists %I on %I', t || '_own_farm', t);

    execute format($f$
      create policy %I on %I for select
      using (farm_id = public.farm_id() and (archived_at is null or public.is_admin()))
    $f$, t || '_select', t);

    execute format($f$
      create policy %I on %I for insert
      with check (farm_id = public.farm_id() and archived_at is null)
    $f$, t || '_insert', t);

    execute format($f$
      create policy %I on %I for update
      using (farm_id = public.farm_id() and archived_at is null)
      with check (farm_id = public.farm_id() and archived_at is null)
    $f$, t || '_update_staff', t);

    execute format($f$
      create policy %I on %I for update
      using (farm_id = public.farm_id() and public.is_admin())
      with check (farm_id = public.farm_id() and public.is_admin())
    $f$, t || '_update_admin', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 4. `users` is shaped differently: no self-serve insert (profiles are only
--    ever created by the security-definer handle_new_user trigger, which — as
--    the table owner's context — bypasses RLS; granting an INSERT policy here
--    would let anyone forge a profile, including their own role). Visibility
--    is admin-sees-all, staff-see-self. Only admins may update (role changes,
--    deactivation).
-- ---------------------------------------------------------------------------
drop policy if exists "users_own_farm" on users;

create policy "users_select" on users for select
  using (farm_id = public.farm_id() and (id = auth.uid() or public.is_admin()));

create policy "users_update_admin" on users for update
  using (farm_id = public.farm_id() and public.is_admin())
  with check (farm_id = public.farm_id() and public.is_admin());
