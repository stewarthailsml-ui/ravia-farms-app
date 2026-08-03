-- Ravia Farms — atomic "deploy" (stock + its purchase expense).
--
-- Deploying a poultry batch or a vegetable unit is one business event with two
-- rows: the stock record, and the EXPENSE transaction that paid for it. The Edge
-- Functions previously issued these as two independent PostgREST calls, so a
-- failure on the second left a committed batch with no expense behind it — and,
-- because the function then returned 500, the client reported the whole deploy
-- as failed while the stock row silently existed. Wrapping them in a single
-- function makes the pair atomic: both rows commit, or neither does.
--
-- SECURITY INVOKER (the default, stated explicitly here because it is the whole
-- point) — these run as the calling user, so the per-table INSERT policies from
-- 20240101000002 still apply. This is a transactionality fix, not a privilege
-- escalation: a caller who could not insert the two rows separately still cannot
-- insert them through here.
--
-- p_date is a `date`, not a timestamp. finance_transactions.date is timestamptz,
-- so it is cast explicitly at the farm's wall-clock day rather than being routed
-- through a client-side new Date(...).toISOString(), which resolved a plain
-- YYYY-MM-DD to UTC midnight and so backdated every expense by a day in UTC+3.

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
as $$
declare
  v_farm  text := public.farm_id();
  v_batch poultry_batches;
begin
  if v_farm is null then
    raise exception 'No farm profile for this account' using errcode = '42501';
  end if;

  insert into poultry_batches (farm_id, name, breed, source, count, unit_price, deploy_date)
  values (v_farm, p_name, p_breed, p_source, p_count, p_unit_price, p_date)
  returning * into v_batch;

  insert into finance_transactions (
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
as $$
declare
  v_farm  text := public.farm_id();
  v_unit  vegetable_units;
  v_stems integer := p_units * 84;  -- one unit = 84 stems (see vegetables Edge Function)
begin
  if v_farm is null then
    raise exception 'No farm profile for this account' using errcode = '42501';
  end if;

  insert into vegetable_units (farm_id, crop_type, source, units, price_per_stem, stems, deploy_date)
  values (v_farm, p_type, p_source, p_units, p_price_per_stem, v_stems, p_date)
  returning * into v_unit;

  insert into finance_transactions (
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

grant execute on function public.deploy_poultry_batch(text, text, text, integer, numeric, date) to authenticated;
grant execute on function public.deploy_vegetable_unit(text, text, integer, numeric, date) to authenticated;
