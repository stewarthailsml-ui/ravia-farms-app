-- Ravia Farms — farm inputs: catalog, purchases, usage, and stock on hand.
--
-- Until now the only structured purchase in the system was a stock deploy
-- (a poultry batch, a vegetable unit), and manual expenses were a flat amount
-- with no sector attribution and a qty/unit-price breakdown hard-coded to the
-- Feed category's "bags". Feeds, vaccines and pesticides are bought constantly,
-- consumed over time, and belong to a sector — none of which was recordable.
--
-- Three tables:
--   input_items     the catalog. Also remembers the last supplier/price per item,
--                   which is what makes the purchase form self-populating.
--   input_purchases money in. Each row is paired 1:1 with an EXPENSE in
--                   finance_transactions, so the P&L stays the single source of truth.
--   input_usage     stock out. Deliberately posts NO finance row — the cost was
--                   already booked at purchase; booking it again double-counts.
--
-- Stock on hand is the input_stock VIEW (purchased - used), never a stored
-- column — the same "net is computed, never stored" invariant the P&L follows.
-- It is why archiving a mis-keyed purchase self-corrects the balance with no
-- reconciliation step.

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------
create table input_items (
  id text primary key default gen_random_uuid()::text,
  farm_id text not null references farms(id) on delete cascade,
  name text not null,
  category text not null check (category in ('FEED','VACCINE','PESTICIDE','MEDICAL','EQUIPMENT','OTHER')),
  sector text not null default 'GENERAL' check (sector in ('POULTRY','VEGETABLES','RABBITRY','CANINE','GENERAL')),
  unit_label text not null,
  -- Prefill hints, not accounting facts: denormalized so the purchase form can
  -- populate supplier + price from a zero-join read. The purchase rows remain
  -- the record of what was actually paid.
  last_supplier text,
  last_unit_price numeric(10,2),
  archived_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_input_items_farm_id on input_items(farm_id);
-- Case-insensitive: "Grower Mash" and "grower mash" are the same input, and two
-- catalog rows for one input would split its stock balance in half.
create unique index idx_input_items_farm_name on input_items(farm_id, lower(name));

create table input_purchases (
  id text primary key default gen_random_uuid()::text,
  farm_id text not null references farms(id) on delete cascade,
  item_id text not null references input_items(id) on delete cascade,
  supplier text not null,
  qty numeric(10,2) not null check (qty > 0),
  unit_price numeric(10,2) not null default 0,
  amount numeric(10,2) not null,
  sector text not null check (sector in ('POULTRY','VEGETABLES','RABBITRY','CANINE','GENERAL')),
  date date not null,
  -- The EXPENSE this purchase created. Nullable only for the instant between the
  -- two inserts inside record_input_purchase; never NULL to any reader.
  finance_txn_id text references finance_transactions(id),
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_input_purchases_farm_id on input_purchases(farm_id);
create index idx_input_purchases_item_id on input_purchases(item_id);

create table input_usage (
  id text primary key default gen_random_uuid()::text,
  farm_id text not null references farms(id) on delete cascade,
  item_id text not null references input_items(id) on delete cascade,
  qty numeric(10,2) not null check (qty > 0),
  sector text not null check (sector in ('POULTRY','VEGETABLES','RABBITRY','CANINE','GENERAL')),
  date date not null,
  notes text,
  -- Carried for the auto-decrement path that isn't built yet: ticking a vaccine
  -- on the poultry schedule, or naming a pesticide in a vegetable health rx,
  -- will call record_input_usage with these populated. Manual entries leave both
  -- NULL, and nothing here needs to change when that lands.
  source_module text check (source_module in ('POULTRY','VEGETABLES','RABBITRY','CANINE')),
  source_ref_id text,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_input_usage_farm_id on input_usage(farm_id);
create index idx_input_usage_item_id on input_usage(item_id);

alter table input_items enable row level security;
alter table input_purchases enable row level security;
alter table input_usage enable row level security;

-- ---------------------------------------------------------------------------
-- 2. Stock on hand — a view, not a column.
--
--    security_invoker so the caller's own RLS on the three base tables applies;
--    without it the view would run as its owner and leak every farm's stock.
--    Archived purchases and usage drop out of the sums, which is precisely how
--    archiving a wrong entry corrects the balance.
-- ---------------------------------------------------------------------------
create view input_stock with (security_invoker = true) as
select
  i.id                                             as item_id,
  i.farm_id,
  i.name,
  i.category,
  i.sector,
  i.unit_label,
  i.last_supplier,
  i.last_unit_price,
  coalesce(p.purchased, 0)                         as purchased,
  coalesce(u.used, 0)                              as used,
  coalesce(p.purchased, 0) - coalesce(u.used, 0)   as on_hand,
  coalesce(p.spent, 0)                             as total_spent,
  p.last_purchase_date
from input_items i
left join (
  select item_id,
         sum(qty)    as purchased,
         sum(amount) as spent,
         max(date)   as last_purchase_date
  from input_purchases
  where archived_at is null
  group by item_id
) p on p.item_id = i.id
left join (
  select item_id, sum(qty) as used
  from input_usage
  where archived_at is null
  group by item_id
) u on u.item_id = i.id
where i.archived_at is null;

grant select on input_stock to authenticated;

-- ---------------------------------------------------------------------------
-- 3. RLS — the same four policies per table as 20240101000002, same loop.
--    Records are never deleted; archive is an UPDATE stamping archived_at, and
--    only admins may perform it or see the result.
-- ---------------------------------------------------------------------------
revoke delete on input_items, input_purchases, input_usage from anon, authenticated;

do $$
declare
  t text;
  tables text[] := array['input_items', 'input_purchases', 'input_usage'];
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

-- ---------------------------------------------------------------------------
-- 4. RPCs.
--
--    SECURITY INVOKER throughout (stated explicitly, as in 20240101000004) —
--    these exist for transactionality, not privilege: the per-table policies
--    above still decide what the caller may write.
--
--    p_date is a `date`, cast to timestamptz only where finance_transactions
--    demands it, so a purchase lands on the farm's wall-clock day rather than
--    being routed through a client-side toISOString() that resolves YYYY-MM-DD
--    to UTC midnight and backdates it a day in UTC+3.
-- ---------------------------------------------------------------------------

-- Purchase categories map onto the finance ledger's free-text `category`.
-- 'GENERAL' has no counterpart in the finance_transactions.source_type check
-- constraint, which predates sectors — it maps to the existing 'OTHER'.
create or replace function public.input_finance_category(p_category text)
returns text
language sql
immutable
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
as $$
declare
  v_farm     text := public.farm_id();
  v_item     input_items;
  v_purchase input_purchases;
  v_txn_id   text;
  v_amount   numeric := p_qty * p_unit_price;
begin
  if v_farm is null then
    raise exception 'No farm profile for this account' using errcode = '42501';
  end if;

  if p_item_id is null then
    -- The "+ New input…" path: create the catalog entry inline so recording a
    -- first-time purchase is one trip, not two.
    insert into input_items (farm_id, name, category, unit_label, sector)
    values (v_farm, p_new_name, p_new_category, p_new_unit_label, coalesce(p_new_sector, p_sector))
    returning * into v_item;
  else
    select * into v_item from input_items where id = p_item_id and farm_id = v_farm;
    if v_item.id is null then
      raise exception 'Input item not found' using errcode = '42704';
    end if;
  end if;

  -- Purchase first: the finance row references it as source_ref_id, which is
  -- what makes an expense traceable back to the thing that was bought.
  insert into input_purchases (
    farm_id, item_id, supplier, qty, unit_price, amount, sector, date, notes
  )
  values (
    v_farm, v_item.id, p_supplier, p_qty, p_unit_price, v_amount, p_sector, p_date, p_notes
  )
  returning * into v_purchase;

  insert into finance_transactions (
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

  update input_purchases
     set finance_txn_id = v_txn_id
   where id = v_purchase.id
  returning * into v_purchase;

  -- Remember for next time. This is the whole mechanism behind the purchase
  -- form's supplier/price prefill and the supplier dropdown.
  update input_items
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
as $$
declare
  v_farm    text := public.farm_id();
  v_item    input_items;
  v_on_hand numeric;
  v_usage   input_usage;
begin
  if v_farm is null then
    raise exception 'No farm profile for this account' using errcode = '42501';
  end if;

  select * into v_item from input_items where id = p_item_id and farm_id = v_farm;
  if v_item.id is null then
    raise exception 'Input item not found' using errcode = '42704';
  end if;

  select on_hand into v_on_hand from input_stock where item_id = p_item_id;

  -- Stock cannot go negative: a balance below zero isn't a warning to reconcile
  -- later, it means either the purchase was never recorded or the qty is wrong,
  -- and both are better caught at entry than discovered in a stock count.
  if coalesce(v_on_hand, 0) < p_qty then
    raise exception 'Only % % of % remain in stock',
      coalesce(v_on_hand, 0), v_item.unit_label, v_item.name
      using errcode = '22023';
  end if;

  insert into input_usage (
    farm_id, item_id, qty, sector, date, notes, source_module, source_ref_id
  )
  values (
    v_farm, p_item_id, p_qty, p_sector, p_date, p_notes, p_source_module, p_source_ref_id
  )
  returning * into v_usage;

  return v_usage;
end;
$$;

-- Archiving a purchase must take its expense with it. The generic archiveRow
-- helper touches one table, which would drop the stock while leaving a ghost
-- EXPENSE inflating the P&L forever.
create or replace function public.archive_input_purchase(p_id text)
returns input_purchases
language plpgsql
security invoker
as $$
declare
  v_farm     text := public.farm_id();
  v_purchase input_purchases;
  v_now      timestamptz := now();
begin
  if v_farm is null then
    raise exception 'No farm profile for this account' using errcode = '42501';
  end if;

  if not public.is_admin() then
    raise exception 'Only an admin (OWNER or MANAGER) may perform this action'
      using errcode = '42501';
  end if;

  update input_purchases
     set archived_at = v_now
   where id = p_id and farm_id = v_farm and archived_at is null
  returning * into v_purchase;

  if v_purchase.id is null then
    raise exception 'Record not found or already archived' using errcode = '42704';
  end if;

  if v_purchase.finance_txn_id is not null then
    update finance_transactions
       set archived_at = v_now
     where id = v_purchase.finance_txn_id and farm_id = v_farm and archived_at is null;
  end if;

  return v_purchase;
end;
$$;

grant execute on function public.input_finance_category(text) to authenticated;
grant execute on function public.record_input_purchase(text, text, text, text, text, text, numeric, numeric, text, date, text) to authenticated;
grant execute on function public.record_input_usage(text, numeric, text, date, text, text, text) to authenticated;
grant execute on function public.archive_input_purchase(text) to authenticated;
