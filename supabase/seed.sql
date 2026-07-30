-- Local dev seed — creates the demo owner advertised on the sign-in screen
-- (owner@ravia.farm / ravia1234). Runs on `supabase db reset`.
--
-- This inserts directly into auth.users (+ auth.identities), then relies on the
-- on_auth_user_created trigger (20240101000001_roles_and_provisioning.sql) to
-- provision the farm + `users` profile — the same path a real signup takes, so
-- the seed also exercises that trigger.
--
-- Idempotent: skips cleanly if this email is already provisioned (e.g. a prior
-- manual setup, or this seed having already run once against this database).

create extension if not exists pgcrypto;

do $$
declare
  demo_user_id uuid := gen_random_uuid();
begin
  if exists (select 1 from auth.users where email = 'owner@ravia.farm') then
    raise notice 'owner@ravia.farm already exists — skipping seed.';
    return;
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, last_sign_in_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    demo_user_id,
    'authenticated',
    'authenticated',
    'owner@ravia.farm',
    crypt('ravia1234', gen_salt('bf')),
    now(), now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('name', 'Ravia Owner', 'farm_name', 'Ravia Farms'),
    now(), now(),
    '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(),
    demo_user_id,
    demo_user_id::text,
    jsonb_build_object('sub', demo_user_id::text, 'email', 'owner@ravia.farm'),
    'email',
    now(), now(), now()
  );
end $$;
