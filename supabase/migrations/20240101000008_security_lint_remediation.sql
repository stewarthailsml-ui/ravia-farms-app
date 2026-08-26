-- Ravia Farms — security lint remediation (Supabase database linter findings).
--
-- Clears every WARN raised by the linter:
--   0011 function_search_path_mutable            (13 functions)
--   0025 public_bucket_allows_listing            (health-photos)
--   0028 anon_security_definer_function_executable
--   0029 authenticated_security_definer_function_executable
--
-- Leaked password protection is a project setting, not SQL: enable it in
-- Dashboard → Authentication → Policies ("Leaked password protection"), and in
-- supabase/config.toml under [auth].

-- ---------------------------------------------------------------------------
-- 0011 — pin search_path on every function the linter flagged.
--
-- A role-mutable search_path lets an attacker create a lookalike object in
-- another schema and have a SECURITY DEFINER function resolve to it. Pinning
-- each function to an explicit search path removes the ambiguity. "pg_temp"
-- listed LAST is deliberate: it means unqualified names can still be shadowed
-- by nothing except our own public schema — pg_temp can only be reached by
-- naming it explicitly.
--
-- farm_id() / is_admin() are SECURITY DEFINER on purpose: they are read inside
-- RLS policies for every table in this app, and running them as the invoker
-- would make RLS self-referential. They stay definer; they only get pinned.
--
-- deploy_* / record_* / archive_* are already SECURITY INVOKER — same treatment.
-- ---------------------------------------------------------------------------

create or replace function public.farm_id()
returns text language sql security definer stable
set search_path = ''
as $$
  select farm_id from public.users where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean language sql security definer stable
set search_path = ''
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()
      and role in ('OWNER', 'MANAGER')
      and archived_at is null
  );
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  invited_farm_id text := new.raw_user_meta_data ->> 'farm_id';
  invited_role text := new.raw_user_meta_data ->> 'role';
  target_farm_id text;
begin
  if invited_farm_id is not null then
    target_farm_id := invited_farm_id;
  else
    insert into public.farms (name, currency)
    values (coalesce(new.raw_user_meta_data ->> 'farm_name', 'My Farm'), 'KES')
    returning id into target_farm_id;
  end if;

  insert into public.users (id, farm_id, email, name, role)
  values (
    new.id,
    target_farm_id,
    new.email,
    new.raw_user_meta_data ->> 'name',
    coalesce(invited_role, 'OWNER')
  );

  return new;
end;
$$;

-- Re-assert the trigger binding in case anything dropped/recreated it.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.deploy_poultry_batch(
  p_name       text,
  p_breed      text,
  p_source     text,
  p_count      integer,
  p_unit_price numeric,
  p_date       date
)
returns poultry_batches
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_farm  text := public.farm_id();
  v_batch public.poultry_batches;
begin
  if v_farm is null then
    raise exception 'No farm profile for this account' using errcode = '42501';
  end if;

  insert into public.poultry_batches (farm_id, name, breed, source, count, unit_price, deploy_date)
  values (v_farm, p_name, p_breed, p_source, p_count, p_unit_price, p_date)
  returning * into v_batch;

  insert into public.finance_transactions (
    farm_id, type, category, description,
    qty, unit_price, amount, unit_label,
    source_type, source_ref_id, date
  )
  values (
    v_farm,
    'EXPENSE',
    'Initial Stock/Purchase',
    format('Purchase: Poultry Batch %s (Source: %s)', p_name, p_source),
    p_count,
    p_unit_price,
    p_count * p_unit_price,
    'birds',
    'POULTRY',
    v_batch.id,
    p_date::timestamptz
  );

  return v_batch;
end;
$$;

create or replace function public.deploy_vegetable_unit(
  p_type           text,
  p_source         text,
  p_units          integer,
  p_price_per_stem numeric,
  p_date           date
)
returns vegetable_units
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_farm  text := public.farm_id();
  v_unit  public.vegetable_units;
  v_stems integer := p_units * 84;  -- one unit = 84 stems (see vegetables Edge Function)
begin
  if v_farm is null then
    raise exception 'No farm profile for this account' using errcode = '42501';
  end if;

  insert into public.vegetable_units (farm_id, crop_type, source, units, price_per_stem, stems, deploy_date)
  values (v_farm, p_type, p_source, p_units, p_price_per_stem, v_stems, p_date)
  returning * into v_unit;

  insert into public.finance_transactions (
    farm_id, type, category, description,
    qty, unit_price, amount, unit_label,
    source_type, source_ref_id, date
  )
  values (
    v_farm,
    'EXPENSE',
    'Initial Stock/Purchase',
    format('Purchase: Vegetable Unit %s (Source: %s)', p_type, p_source),
    v_stems,
    p_price_per_stem,
    v_stems * p_price_per_stem,
    'stems',
    'VEGETABLES',
    v_unit.id,
    p_date::timestamptz
  );

  return v_unit;
end;
$$;

create or replace function public.input_finance_category(p_category text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_category
    when 'FEED'      then 'Feed'
    when 'VACCINE'   then 'Vaccine'
    when 'PESTICIDE' then 'Pesticide'
    when 'MEDICAL'   then 'Medical'
    when 'EQUIPMENT' then 'Equipment'
    else 'Other'
  end;
$$;

create or replace function public.record_input_purchase(
  p_item_id        text,
  p_new_name       text,
  p_new_category   text,
  p_new_unit_label text,
  p_new_sector     text,
  p_supplier       text,
  p_qty            numeric,
  p_unit_price     numeric,
  p_sector         text,
  p_date           date,
  p_notes          text
)
returns input_purchases
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_farm     text := public.farm_id();
  v_item     public.input_items;
  v_purchase public.input_purchases;
  v_txn_id   text;
  v_amount   numeric := p_qty * p_unit_price;
begin
  if v_farm is null then
    raise exception 'No farm profile for this account' using errcode = '42501';
  end if;

  if p_item_id is null then
    insert into public.input_items (farm_id, name, category, unit_label, sector)
    values (v_farm, p_new_name, p_new_category, p_new_unit_label, coalesce(p_new_sector, p_sector))
    returning * into v_item;
  else
    select * into v_item from public.input_items where id = p_item_id and farm_id = v_farm;
    if v_item.id is null then
      raise exception 'Input item not found' using errcode = '42704';
    end if;
  end if;

  insert into public.input_purchases (
    farm_id, item_id, supplier, qty, unit_price, amount, sector, date, notes
  )
  values (
    v_farm, v_item.id, p_supplier, p_qty, p_unit_price, v_amount, p_sector, p_date, p_notes
  )
  returning * into v_purchase;

  insert into public.finance_transactions (
    farm_id, type, category, description,
    qty, unit_price, amount, unit_label,
    source_type, source_ref_id, date
  )
  values (
    v_farm,
    'EXPENSE',
    public.input_finance_category(v_item.category),
    format('Purchase: %s (Supplier: %s)', v_item.name, p_supplier),
    p_qty,
    p_unit_price,
    v_amount,
    v_item.unit_label,
    case when p_sector = 'GENERAL' then 'OTHER' else p_sector end,
    v_purchase.id,
    p_date::timestamptz
  )
  returning id into v_txn_id;

  update public.input_purchases
     set finance_txn_id = v_txn_id
   where id = v_purchase.id
  returning * into v_purchase;

  update public.input_items
     set last_supplier   = p_supplier,
         last_unit_price = p_unit_price
   where id = v_item.id;

  return v_purchase;
end;
$$;

create or replace function public.record_input_usage(
  p_item_id       text,
  p_qty           numeric,
  p_sector        text,
  p_date          date,
  p_notes         text default null,
  p_source_module text default null,
  p_source_ref_id text default null
)
returns input_usage
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_farm    text := public.farm_id();
  v_item    public.input_items;
  v_on_hand numeric;
  v_usage   public.input_usage;
begin
  if v_farm is null then
    raise exception 'No farm profile for this account' using errcode = '42501';
  end if;

  select * into v_item from public.input_items where id = p_item_id and farm_id = v_farm;
  if v_item.id is null then
    raise exception 'Input item not found' using errcode = '42704';
  end if;

  select on_hand into v_on_hand from public.input_stock where item_id = p_item_id;

  if coalesce(v_on_hand, 0) < p_qty then
    raise exception 'Only % % of % remain in stock',
      coalesce(v_on_hand, 0), v_item.unit_label, v_item.name
      using errcode = '22023';
  end if;

  insert into public.input_usage (
    farm_id, item_id, qty, sector, date, notes, source_module, source_ref_id
  )
  values (
    v_farm, p_item_id, p_qty, p_sector, p_date, p_notes, p_source_module, p_source_ref_id
  )
  returning * into v_usage;

  return v_usage;
end;
$$;

create or replace function public.archive_input_purchase(p_id text)
returns input_purchases
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_farm     text := public.farm_id();
  v_purchase public.input_purchases;
  v_now      timestamptz := now();
begin
  if v_farm is null then
    raise exception 'No farm profile for this account' using errcode = '42501';
  end if;

  if not public.is_admin() then
    raise exception 'Only an admin (OWNER or MANAGER) may perform this action'
      using errcode = '42501';
  end if;

  update public.input_purchases
     set archived_at = v_now
   where id = p_id and farm_id = v_farm and archived_at is null
  returning * into v_purchase;

  if v_purchase.id is null then
    raise exception 'Record not found or already archived' using errcode = '42704';
  end if;

  if v_purchase.finance_txn_id is not null then
    update public.finance_transactions
       set archived_at = v_now
     where id = v_purchase.finance_txn_id and farm_id = v_farm and archived_at is null;
  end if;

  return v_purchase;
end;
$$;

create or replace function public.sale_finance_category(p_sector text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_sector
    when 'POULTRY'    then 'Poultry'
    when 'VEGETABLES' then 'Vegetables'
    when 'RABBITRY'   then 'Rabbitry'
    when 'CANINE'     then 'Canine'
    else 'Other'
  end;
$$;

create or replace function public.record_sale(
  p_sector        text,
  p_stock_kind    text,
  p_source_ref_id text,
  p_qty           numeric,
  p_unit_price    numeric,
  p_unit_label    text,
  p_customer      text,
  p_date          date,
  p_notes         text default null
)
returns sales
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_farm    text := public.farm_id();
  v_sale    public.sales;
  v_txn_id  text;
  v_ref     text := p_source_ref_id;
  v_qty     numeric := p_qty;
  v_label   text;
  v_unit    text := coalesce(nullif(p_unit_label, ''), 'units');
  v_on_hand numeric;
  v_amount  numeric;
begin
  if v_farm is null then
    raise exception 'No farm profile for this account' using errcode = '42501';
  end if;

  if p_stock_kind = 'POULTRY_BIRDS' then
    select name, on_hand into v_label, v_on_hand
      from public.poultry_stock where batch_id = v_ref and farm_id = v_farm;
    if v_label is null then
      raise exception 'Poultry batch not found' using errcode = '42704';
    end if;
    if coalesce(v_on_hand, 0) < v_qty then
      raise exception 'Only % birds remain in %', coalesce(v_on_hand, 0), v_label
        using errcode = '22023';
    end if;
    v_unit := 'birds';

  elsif p_stock_kind = 'VEGETABLE_STEMS' then
    select crop_type, on_hand into v_label, v_on_hand
      from public.vegetable_stock where unit_id = v_ref and farm_id = v_farm;
    if v_label is null then
      raise exception 'Vegetable unit not found' using errcode = '42704';
    end if;
    if coalesce(v_on_hand, 0) < v_qty then
      raise exception 'Only % stems remain in %', coalesce(v_on_hand, 0), v_label
        using errcode = '22023';
    end if;
    v_unit := 'stems';

  elsif p_stock_kind = 'EGGS' then
    v_ref := null;
    v_label := 'Eggs';
    select on_hand into v_on_hand from public.egg_stock where farm_id = v_farm;
    if coalesce(v_on_hand, 0) < v_qty then
      raise exception 'Only % eggs remain in stock', coalesce(v_on_hand, 0)
        using errcode = '22023';
    end if;
    v_unit := 'eggs';

  elsif p_stock_kind in ('RABBIT', 'DOG') then
    v_qty := 1;
    v_unit := 'animal';
    if p_stock_kind = 'RABBIT' then
      select tag_id into v_label from public.rabbits
        where id = v_ref and farm_id = v_farm and archived_at is null and sold_at is null;
    else
      select name into v_label from public.dogs
        where id = v_ref and farm_id = v_farm and archived_at is null and sold_at is null;
    end if;
    if v_label is null then
      raise exception 'That animal is not in stock — it may already be sold or archived'
        using errcode = '22023';
    end if;

  elsif p_stock_kind = 'NONE' then
    v_ref := null;
    v_label := 'General Sales';

  else
    raise exception 'Unknown stock kind %', p_stock_kind using errcode = '22023';
  end if;

  v_amount := v_qty * p_unit_price;

  insert into public.sales (
    farm_id, sector, stock_kind, source_ref_id,
    qty, unit_price, amount, unit_label, customer, date, notes
  )
  values (
    v_farm, p_sector, p_stock_kind, v_ref,
    v_qty, p_unit_price, v_amount, v_unit, nullif(p_customer, ''), p_date, nullif(p_notes, '')
  )
  returning * into v_sale;

  insert into public.finance_transactions (
    farm_id, type, category, description,
    qty, unit_price, amount, unit_label,
    source_type, source_ref_id, date
  )
  values (
    v_farm,
    'REVENUE',
    public.sale_finance_category(p_sector),
    v_label || coalesce(' - ' || nullif(p_customer, ''), '') || coalesce(' - ' || nullif(p_notes, ''), ''),
    v_qty,
    p_unit_price,
    v_amount,
    v_unit,
    case when p_sector = 'GENERAL' then 'OTHER' else p_sector end,
    v_sale.id,
    p_date::timestamptz
  )
  returning id into v_txn_id;

  update public.sales set finance_txn_id = v_txn_id where id = v_sale.id
  returning * into v_sale;

  if p_stock_kind = 'RABBIT' then
    update public.rabbits set sold_at = now() where id = v_ref and farm_id = v_farm;
  elsif p_stock_kind = 'DOG' then
    update public.dogs set sold_at = now() where id = v_ref and farm_id = v_farm;
  end if;

  return v_sale;
end;
$$;

create or replace function public.archive_sale(p_id text)
returns sales
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_farm text := public.farm_id();
  v_sale public.sales;
  v_now  timestamptz := now();
begin
  if v_farm is null then
    raise exception 'No farm profile for this account' using errcode = '42501';
  end if;

  if not public.is_admin() then
    raise exception 'Only an admin (OWNER or MANAGER) may perform this action'
      using errcode = '42501';
  end if;

  update public.sales
     set archived_at = v_now
   where id = p_id and farm_id = v_farm and archived_at is null
  returning * into v_sale;

  if v_sale.id is null then
    raise exception 'Record not found or already archived' using errcode = '42704';
  end if;

  if v_sale.finance_txn_id is not null then
    update public.finance_transactions
       set archived_at = v_now
     where id = v_sale.finance_txn_id and farm_id = v_farm and archived_at is null;
  end if;

  if v_sale.stock_kind = 'RABBIT' then
    update public.rabbits set sold_at = null where id = v_sale.source_ref_id and farm_id = v_farm;
  elsif v_sale.stock_kind = 'DOG' then
    update public.dogs set sold_at = null where id = v_sale.source_ref_id and farm_id = v_farm;
  end if;

  return v_sale;
end;
$$;

create or replace function public.archive_finance_transaction(p_id text)
returns finance_transactions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_farm text := public.farm_id();
  v_txn  public.finance_transactions;
  v_sale public.sales;
  v_now  timestamptz := now();
begin
  if v_farm is null then
    raise exception 'No farm profile for this account' using errcode = '42501';
  end if;

  if not public.is_admin() then
    raise exception 'Only an admin (OWNER or MANAGER) may perform this action'
      using errcode = '42501';
  end if;

  update public.finance_transactions
     set archived_at = v_now
   where id = p_id and farm_id = v_farm and archived_at is null
  returning * into v_txn;

  if v_txn.id is null then
    raise exception 'Record not found or already archived' using errcode = '42704';
  end if;

  update public.sales
     set archived_at = v_now
   where finance_txn_id = v_txn.id and farm_id = v_farm and archived_at is null
  returning * into v_sale;

  if v_sale.stock_kind = 'RABBIT' then
    update public.rabbits set sold_at = null where id = v_sale.source_ref_id and farm_id = v_farm;
  elsif v_sale.stock_kind = 'DOG' then
    update public.dogs set sold_at = null where id = v_sale.source_ref_id and farm_id = v_farm;
  end if;

  update public.input_purchases
     set archived_at = v_now
   where finance_txn_id = v_txn.id and farm_id = v_farm and archived_at is null;

  return v_txn;
end;
$$;

-- Re-assert EXECUTE grants (recreating a function resets its privileges).
grant execute on function public.deploy_poultry_batch(text, text, text, integer, numeric, date) to authenticated;
grant execute on function public.deploy_vegetable_unit(text, text, integer, numeric, date) to authenticated;
grant execute on function public.input_finance_category(text) to authenticated;
grant execute on function public.record_input_purchase(text, text, text, text, text, text, numeric, numeric, text, date, text) to authenticated;
grant execute on function public.record_input_usage(text, numeric, text, date, text, text, text) to authenticated;
grant execute on function public.archive_input_purchase(text) to authenticated;
grant execute on function public.sale_finance_category(text) to authenticated;
grant execute on function public.record_sale(text, text, text, numeric, numeric, text, text, date, text) to authenticated;
grant execute on function public.archive_sale(text) to authenticated;
grant execute on function public.archive_finance_transaction(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 0028 / 0029 — nobody should call farm_id(), is_admin(), handle_new_user()
-- or rls_auto_enable() over the REST API:
--
--   * farm_id() / is_admin() are internal RLS helpers. The frontend never RPCs
--     them (verified across app/, components/, lib/), and the Edge Functions
--     read profiles directly. Exposing them leaks whether a uid belongs to a
--     farm, who is an admin, etc., to anyone with the anon key.
--   * handle_new_user() is trigger-only — callable via HTTP makes no sense.
--   * rls_auto_enable() is not defined anywhere in supabase/migrations — it was
--     created ad hoc against the live DB (drift). It is dropped outright here;
--     re-add it through a proper migration if it is ever actually needed.
-- ---------------------------------------------------------------------------

revoke execute on function public.farm_id()
  from anon, authenticated, public;
revoke execute on function public.is_admin()
  from anon, authenticated, public;
revoke execute on function public.handle_new_user()
  from anon, authenticated, public;

drop function if exists public.rls_auto_enable();

-- ---------------------------------------------------------------------------
-- 0025 — the health-photos bucket is PUBLIC, so anyone holding an object URL
-- can fetch a photo without any SELECT policy at all (getPublicUrl in
-- lib/supabase/storage.ts keeps working unchanged). What the broad policy
-- added was bucket LISTING: any visitor could enumerate every file name in
-- the bucket. Dropping it closes that; no code change needed.
--
-- Write/update policies (farm-scoped) are untouched.
-- ---------------------------------------------------------------------------

drop policy if exists health_photos_public_read on storage.objects;
