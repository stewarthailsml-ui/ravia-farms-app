-- Ravia Farms — sales: revenue and physical stock, reconciled in one transaction.
--
-- 20240101000005 gave inputs a closed loop: a purchase writes its own EXPENSE,
-- usage cannot exceed the computed balance, and `input_stock` recomputes
-- purchased - used so archiving a mis-keyed row self-corrects. The sales side
-- had none of it. Revenue was a plain insert with source_ref_id = NULL against a
-- "Source Batch / Item" that was a *display string*, and nothing anywhere
-- reduced inventory — because there was no inventory to reduce:
--
--   poultry_batches.count   the deploy count, never mutated
--   poultry_health.mortality logged, never subtracted from anything
--   vegetable_units.stems   likewise frozen
--   eggs laid / incubated / sold  three unrelated numbers
--
-- So the bird count on the poultry card has been wrong since the first death was
-- recorded, and selling fifty birds moved money without moving stock.
--
-- This migration closes that loop with the same three pieces:
--
--   sales           stock out. Paired 1:1 with a REVENUE in finance_transactions,
--                   inserted by the same plpgsql call, so the P&L stays the single
--                   source of truth and neither row can exist without the other.
--   *_stock views   on hand = deployed - losses - sold. Computed, never stored —
--                   the same invariant as input_stock and the P&L, and the reason
--                   archiving a wrong sale restores the balance with no
--                   reconciliation step.
--   record_sale     refuses to oversell, exactly as record_input_usage refuses to
--                   over-consume.
--
-- Historical note: REVENUE rows recorded before this migration have no `sales`
-- row and therefore draw down nothing. That is deliberate — back-filling them
-- would mean inventing stock movements nobody recorded. A farm needing a
-- corrected opening balance should enter the difference as mortality/loss.

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------
create table sales (
  id text primary key default gen_random_uuid()::text,
  farm_id text not null references farms(id) on delete cascade,
  sector text not null check (sector in ('POULTRY','VEGETABLES','RABBITRY','CANINE','GENERAL')),
  -- Which physical balance this sale draws down. 'NONE' is a deliberate value,
  -- not a fallback: "General Sales" and one-off other income are money with no
  -- stock behind them, and forcing them to name a batch would invent inventory.
  stock_kind text not null check (stock_kind in
    ('POULTRY_BIRDS','EGGS','VEGETABLE_STEMS','RABBIT','DOG','NONE')),
  -- Polymorphic, keyed by stock_kind: poultry_batches.id | vegetable_units.id |
  -- rabbits.id | dogs.id | NULL for EGGS and NONE. No FK, matching the existing
  -- finance_transactions.source_ref_id — one column cannot reference four tables.
  source_ref_id text,
  qty numeric(10,2) not null check (qty > 0),
  unit_price numeric(10,2) not null default 0,
  amount numeric(10,2) not null,
  unit_label text not null,
  customer text,
  date date not null,
  -- The REVENUE this sale created. Nullable only for the instant between the two
  -- inserts inside record_sale; never NULL to any reader.
  finance_txn_id text references finance_transactions(id),
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_sales_farm_id on sales(farm_id);
create index idx_sales_source_ref on sales(source_ref_id);

alter table sales enable row level security;

-- An individual animal is not a quantity. Its "stock" is presence, so selling one
-- is a state change rather than a decrement, and sold_at is what removes it from
-- the herd without deleting the record or losing its history.
alter table rabbits add column sold_at timestamptz;
alter table dogs add column sold_at timestamptz;

-- ---------------------------------------------------------------------------
-- 2. Stock on hand — views, not columns.
--
--    security_invoker throughout so the caller's own RLS on the base tables
--    applies; without it these would run as owner and leak every farm's stock.
--    Archived batches, deaths and sales all drop out of the sums, which is
--    precisely how archiving a wrong entry corrects the balance.
-- ---------------------------------------------------------------------------
create view poultry_stock with (security_invoker = true) as
select
  b.id                                                            as batch_id,
  b.farm_id,
  b.name,
  b.breed,
  b.deploy_date,
  b.count                                                         as deployed,
  coalesce(h.mortality, 0)                                        as mortality,
  coalesce(s.sold, 0)                                             as sold,
  b.count - coalesce(h.mortality, 0) - coalesce(s.sold, 0)        as on_hand
from poultry_batches b
left join (
  select batch_id, sum(mortality) as mortality
  from poultry_health
  where archived_at is null and batch_id is not null
  group by batch_id
) h on h.batch_id = b.id
left join (
  select source_ref_id, sum(qty) as sold
  from sales
  where archived_at is null and stock_kind = 'POULTRY_BIRDS'
  group by source_ref_id
) s on s.source_ref_id = b.id
where b.archived_at is null;

create view vegetable_stock with (security_invoker = true) as
select
  v.id                                                            as unit_id,
  v.farm_id,
  v.crop_type,
  v.deploy_date,
  v.units,
  v.stems                                                         as deployed,
  coalesce(h.loss, 0)                                             as loss,
  coalesce(s.sold, 0)                                             as sold,
  v.stems - coalesce(h.loss, 0) - coalesce(s.sold, 0)             as on_hand
from vegetable_units v
left join (
  select unit_id, sum(loss) as loss
  from vegetable_health
  where archived_at is null and unit_id is not null
  group by unit_id
) h on h.unit_id = v.id
left join (
  select source_ref_id, sum(qty) as sold
  from sales
  where archived_at is null and stock_kind = 'VEGETABLE_STEMS'
  group by source_ref_id
) s on s.source_ref_id = v.id
where v.archived_at is null;

-- One row per farm. Eggs are fungible — they are not tied to a batch — so the
-- balance is farm-wide. Incubation is netted here because setting eggs genuinely
-- consumes them; leaving it out is what made the tray count fiction.
create view egg_stock with (security_invoker = true) as
select
  f.id                                                            as farm_id,
  coalesce(e.laid, 0)                                             as laid,
  coalesce(i.incubated, 0)                                        as incubated,
  coalesce(s.sold, 0)                                             as sold,
  coalesce(e.laid, 0) - coalesce(i.incubated, 0) - coalesce(s.sold, 0) as on_hand
from farms f
left join (
  select farm_id, sum(count) as laid from egg_records
  where archived_at is null group by farm_id
) e on e.farm_id = f.id
left join (
  select farm_id, sum(count) as incubated from incubations
  where archived_at is null group by farm_id
) i on i.farm_id = f.id
left join (
  select farm_id, sum(qty) as sold from sales
  where archived_at is null and stock_kind = 'EGGS' group by farm_id
) s on s.farm_id = f.id;

-- ---------------------------------------------------------------------------
-- 3. RLS — the same four policies as 20240101000002/000005, same loop.
-- ---------------------------------------------------------------------------
revoke delete on sales from anon, authenticated;

do $$
declare
  t text;
  tables text[] := array['sales'];
begin
  foreach t in array tables loop
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

-- New tables are not auto-exposed through PostgREST (see 20240101000006 and
-- api.auto_expose_new_tables in config.toml): RLS narrows access, it does not
-- grant it. SELECT/INSERT/UPDATE only — records are archived, never deleted.
grant select, insert, update on sales to authenticated;
grant select on poultry_stock, vegetable_stock, egg_stock to authenticated;

-- ---------------------------------------------------------------------------
-- 4. RPCs.
--
--    SECURITY INVOKER throughout, as in 000004/000005 — these exist for
--    transactionality, not privilege: the policies above still decide what the
--    caller may write. A plpgsql body is one implicit transaction, which is the
--    whole point: the sale and its REVENUE commit together or not at all, so an
--    oversell raises before either row exists.
--
--    p_date is a `date`, cast to timestamptz only where finance_transactions
--    demands it, so a sale lands on the farm's wall-clock day instead of being
--    routed through a client toISOString() that resolves YYYY-MM-DD to UTC
--    midnight and backdates it a day in UTC+3.
-- ---------------------------------------------------------------------------

-- Sectors map onto the finance ledger's free-text `category` (the labels the
-- revenue form already shows). 'GENERAL' has no counterpart in the
-- finance_transactions.source_type check constraint, which predates sectors, so
-- it maps to 'OTHER' there — the same compromise input_finance_category makes.
create or replace function public.sale_finance_category(p_sector text)
returns text
language sql
immutable
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
as $$
declare
  v_farm    text := public.farm_id();
  v_sale    sales;
  v_txn_id  text;
  v_ref     text := p_source_ref_id;
  v_qty     numeric := p_qty;
  v_label   text;      -- what was sold, for the ledger description
  v_unit    text := coalesce(nullif(p_unit_label, ''), 'units');
  v_on_hand numeric;
  v_amount  numeric;
begin
  if v_farm is null then
    raise exception 'No farm profile for this account' using errcode = '42501';
  end if;

  -- Stock cannot go negative. A balance below zero is not a warning to reconcile
  -- later: it means either the deploy was never recorded or the qty is wrong, and
  -- both are better caught at entry than discovered in a stock count.
  if p_stock_kind = 'POULTRY_BIRDS' then
    select name, on_hand into v_label, v_on_hand
      from poultry_stock where batch_id = v_ref and farm_id = v_farm;
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
      from vegetable_stock where unit_id = v_ref and farm_id = v_farm;
    if v_label is null then
      raise exception 'Vegetable unit not found' using errcode = '42704';
    end if;
    if coalesce(v_on_hand, 0) < v_qty then
      raise exception 'Only % stems remain in %', coalesce(v_on_hand, 0), v_label
        using errcode = '22023';
    end if;
    v_unit := 'stems';

  elsif p_stock_kind = 'EGGS' then
    -- Farm-wide, so there is nothing to reference.
    v_ref := null;
    v_label := 'Eggs';
    select on_hand into v_on_hand from egg_stock where farm_id = v_farm;
    if coalesce(v_on_hand, 0) < v_qty then
      raise exception 'Only % eggs remain in stock', coalesce(v_on_hand, 0)
        using errcode = '22023';
    end if;
    v_unit := 'eggs';

  elsif p_stock_kind in ('RABBIT', 'DOG') then
    -- One animal, sold once. qty is forced to 1 rather than trusted: a "3" here
    -- would silently claim to sell the same rabbit three times.
    v_qty := 1;
    v_unit := 'animal';
    if p_stock_kind = 'RABBIT' then
      select tag_id into v_label from rabbits
        where id = v_ref and farm_id = v_farm and archived_at is null and sold_at is null;
    else
      select name into v_label from dogs
        where id = v_ref and farm_id = v_farm and archived_at is null and sold_at is null;
    end if;
    if v_label is null then
      raise exception 'That animal is not in stock — it may already be sold or archived'
        using errcode = '22023';
    end if;

  elsif p_stock_kind = 'NONE' then
    -- Money with no stock behind it: general sales, one-off other income.
    v_ref := null;
    v_label := 'General Sales';

  else
    raise exception 'Unknown stock kind %', p_stock_kind using errcode = '22023';
  end if;

  v_amount := v_qty * p_unit_price;

  -- Sale first: the finance row references it as source_ref_id, which is what
  -- makes revenue traceable back to the stock that left the farm.
  insert into sales (
    farm_id, sector, stock_kind, source_ref_id,
    qty, unit_price, amount, unit_label, customer, date, notes
  )
  values (
    v_farm, p_sector, p_stock_kind, v_ref,
    v_qty, p_unit_price, v_amount, v_unit, nullif(p_customer, ''), p_date, nullif(p_notes, '')
  )
  returning * into v_sale;

  insert into finance_transactions (
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

  update sales set finance_txn_id = v_txn_id where id = v_sale.id
  returning * into v_sale;

  -- Only now that the sale is on the books does the animal leave the herd.
  if p_stock_kind = 'RABBIT' then
    update rabbits set sold_at = now() where id = v_ref and farm_id = v_farm;
  elsif p_stock_kind = 'DOG' then
    update dogs set sold_at = now() where id = v_ref and farm_id = v_farm;
  end if;

  return v_sale;
end;
$$;

-- Archiving a sale must take its revenue with it, and vice versa. The generic
-- archiveRow helper touches one table: from the sales side that would restore the
-- stock while leaving a ghost REVENUE inflating the P&L forever; from the finance
-- side it would drop the revenue while the sale silently holds the stock down.
-- Hence one function per direction.
create or replace function public.archive_sale(p_id text)
returns sales
language plpgsql
security invoker
as $$
declare
  v_farm text := public.farm_id();
  v_sale sales;
  v_now  timestamptz := now();
begin
  if v_farm is null then
    raise exception 'No farm profile for this account' using errcode = '42501';
  end if;

  if not public.is_admin() then
    raise exception 'Only an admin (OWNER or MANAGER) may perform this action'
      using errcode = '42501';
  end if;

  update sales
     set archived_at = v_now
   where id = p_id and farm_id = v_farm and archived_at is null
  returning * into v_sale;

  if v_sale.id is null then
    raise exception 'Record not found or already archived' using errcode = '42704';
  end if;

  if v_sale.finance_txn_id is not null then
    update finance_transactions
       set archived_at = v_now
     where id = v_sale.finance_txn_id and farm_id = v_farm and archived_at is null;
  end if;

  -- Quantities come back on their own (the views ignore archived sales); an
  -- individual animal has to be put back into the herd explicitly.
  if v_sale.stock_kind = 'RABBIT' then
    update rabbits set sold_at = null where id = v_sale.source_ref_id and farm_id = v_farm;
  elsif v_sale.stock_kind = 'DOG' then
    update dogs set sold_at = null where id = v_sale.source_ref_id and farm_id = v_farm;
  end if;

  return v_sale;
end;
$$;

-- The reverse: archiving from the transaction list. Covers input purchases too,
-- which had the same one-sided hole in the other direction.
create or replace function public.archive_finance_transaction(p_id text)
returns finance_transactions
language plpgsql
security invoker
as $$
declare
  v_farm text := public.farm_id();
  v_txn  finance_transactions;
  v_sale sales;
  v_now  timestamptz := now();
begin
  if v_farm is null then
    raise exception 'No farm profile for this account' using errcode = '42501';
  end if;

  if not public.is_admin() then
    raise exception 'Only an admin (OWNER or MANAGER) may perform this action'
      using errcode = '42501';
  end if;

  update finance_transactions
     set archived_at = v_now
   where id = p_id and farm_id = v_farm and archived_at is null
  returning * into v_txn;

  if v_txn.id is null then
    raise exception 'Record not found or already archived' using errcode = '42704';
  end if;

  update sales
     set archived_at = v_now
   where finance_txn_id = v_txn.id and farm_id = v_farm and archived_at is null
  returning * into v_sale;

  if v_sale.stock_kind = 'RABBIT' then
    update rabbits set sold_at = null where id = v_sale.source_ref_id and farm_id = v_farm;
  elsif v_sale.stock_kind = 'DOG' then
    update dogs set sold_at = null where id = v_sale.source_ref_id and farm_id = v_farm;
  end if;

  update input_purchases
     set archived_at = v_now
   where finance_txn_id = v_txn.id and farm_id = v_farm and archived_at is null;

  return v_txn;
end;
$$;

grant execute on function public.sale_finance_category(text) to authenticated;
grant execute on function public.record_sale(text, text, text, numeric, numeric, text, text, date, text) to authenticated;
grant execute on function public.archive_sale(text) to authenticated;
grant execute on function public.archive_finance_transaction(text) to authenticated;
