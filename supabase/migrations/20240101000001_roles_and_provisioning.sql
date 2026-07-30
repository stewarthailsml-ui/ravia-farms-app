-- Ravia Farms — roles, admin helper, and account provisioning.
--
-- Without this migration, a successful Supabase Auth login still has no `users`
-- profile row (nothing ever created one), so every Edge Function's farm_id lookup
-- fails. This adds the trigger that provisions a profile on signup / invite, plus
-- the role vocabulary and an is_admin() helper the RLS policies in the next
-- migration depend on.

-- 1. Lock down `role` to the four documented values (previously unconstrained text).
alter table users add constraint users_role_check
  check (role in ('OWNER', 'MANAGER', 'FARM_HAND', 'VET'));

-- 2. Admin helper — OWNER/MANAGER are the two admin-tier roles (can archive, manage staff).
-- NOTE: no `archived_at` check yet — that column doesn't exist until the next
-- migration (20240101000002), which also re-defines this function to add it.
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from users
    where id = auth.uid()
      and role in ('OWNER', 'MANAGER')
  );
$$ language sql security definer stable;

-- 3. `farms` was missing RLS entirely — every other table has it.
alter table farms enable row level security;
create policy "farms_own_farm" on farms for select using (id = public.farm_id());
create policy "farms_admin_update" on farms for update
  using (id = public.farm_id() and public.is_admin())
  with check (id = public.farm_id() and public.is_admin());

-- 4. Provisioning trigger. Branches on invite metadata:
--    - Staff invited via the Staff admin function carry `farm_id` + `role` in
--      raw_user_meta_data (set by auth.admin.inviteUserByEmail) and join that
--      existing farm at that role.
--    - A first-time signup (no such metadata) gets a brand-new farm and becomes
--      its OWNER. Without this branch, an invited staff member would silently
--      get their own empty farm instead of joining their admin's.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  invited_farm_id text := new.raw_user_meta_data ->> 'farm_id';
  invited_role text := new.raw_user_meta_data ->> 'role';
  target_farm_id text;
begin
  if invited_farm_id is not null then
    target_farm_id := invited_farm_id;
  else
    insert into farms (name, currency)
    values (coalesce(new.raw_user_meta_data ->> 'farm_name', 'My Farm'), 'KES')
    returning id into target_farm_id;
  end if;

  insert into users (id, farm_id, email, name, role)
  values (
    new.id,
    target_farm_id,
    new.email,
    new.raw_user_meta_data ->> 'name',
    coalesce(invited_role, 'OWNER')
  );

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
