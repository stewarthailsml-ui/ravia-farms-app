-- Ravia Farms — Supabase schema migration
create extension if not exists "uuid-ossp";

create table farms (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  currency text not null default 'KES',
  created_at timestamptz not null default now()
);

create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  farm_id text not null references farms(id) on delete cascade,
  email text not null,
  name text,
  role text not null default 'FARM_HAND',
  created_at timestamptz not null default now(),
  unique(farm_id, email)
);
create index idx_users_farm_id on users(farm_id);

create table poultry_batches (
  id text primary key default gen_random_uuid()::text,
  farm_id text not null references farms(id) on delete cascade,
  name text not null,
  breed text not null,
  source text not null,
  count integer not null,
  unit_price numeric(10,2) not null default 0,
  deploy_date date not null,
  created_at timestamptz not null default now()
);
create index idx_poultry_batches_farm_id on poultry_batches(farm_id);

create table egg_records (
  id text primary key default gen_random_uuid()::text,
  farm_id text not null references farms(id) on delete cascade,
  count integer not null,
  date date not null,
  created_at timestamptz not null default now()
);
create index idx_egg_records_farm_id on egg_records(farm_id);

create table incubations (
  id text primary key default gen_random_uuid()::text,
  farm_id text not null references farms(id) on delete cascade,
  count integer not null,
  date date not null,
  created_at timestamptz not null default now()
);
create index idx_incubations_farm_id on incubations(farm_id);

create table poultry_health (
  id text primary key default gen_random_uuid()::text,
  farm_id text not null references farms(id) on delete cascade,
  batch_id text references poultry_batches(id) on delete set null,
  batch_name text not null,
  issue text not null,
  affected integer not null default 0,
  mortality integer not null default 0,
  rx text,
  photo_url text,
  date timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index idx_poultry_health_farm_id on poultry_health(farm_id);

create table vegetable_units (
  id text primary key default gen_random_uuid()::text,
  farm_id text not null references farms(id) on delete cascade,
  crop_type text not null,
  source text not null,
  units integer not null,
  price_per_stem numeric(10,2) not null default 0,
  stems integer not null,
  deploy_date date not null,
  created_at timestamptz not null default now()
);
create index idx_vegetable_units_farm_id on vegetable_units(farm_id);

create table vegetable_health (
  id text primary key default gen_random_uuid()::text,
  farm_id text not null references farms(id) on delete cascade,
  unit_id text references vegetable_units(id) on delete set null,
  batch_name text not null,
  issue text not null,
  affected integer not null default 0,
  loss integer not null default 0,
  rx text,
  photo_url text,
  date timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index idx_vegetable_health_farm_id on vegetable_health(farm_id);

create table rabbits (
  id text primary key default gen_random_uuid()::text,
  farm_id text not null references farms(id) on delete cascade,
  tag_id text not null,
  breed text not null,
  sex text not null,
  source text not null,
  price numeric(10,2) not null default 0,
  acquired_date date not null,
  created_at timestamptz not null default now()
);
create index idx_rabbits_farm_id on rabbits(farm_id);

create table rabbit_pairings (
  id text primary key default gen_random_uuid()::text,
  farm_id text not null references farms(id) on delete cascade,
  doe_id text not null references rabbits(id) on delete cascade,
  buck_id text not null references rabbits(id) on delete cascade,
  date date not null,
  created_at timestamptz not null default now(),
  unique(farm_id, doe_id, buck_id, date)
);
create index idx_rabbit_pairings_farm_id on rabbit_pairings(farm_id);

create table dogs (
  id text primary key default gen_random_uuid()::text,
  farm_id text not null references farms(id) on delete cascade,
  name text not null,
  breed text not null,
  sex text not null,
  source text not null,
  price numeric(10,2) not null default 0,
  pedigree text,
  acquired_date date not null,
  created_at timestamptz not null default now()
);
create index idx_dogs_farm_id on dogs(farm_id);

create table dog_heats (
  id text primary key default gen_random_uuid()::text,
  farm_id text not null references farms(id) on delete cascade,
  dog_id text not null references dogs(id) on delete cascade,
  date date not null,
  created_at timestamptz not null default now()
);
create index idx_dog_heats_farm_id on dog_heats(farm_id);

create table finance_transactions (
  id text primary key default gen_random_uuid()::text,
  farm_id text not null references farms(id) on delete cascade,
  type text not null check (type in ('REVENUE','EXPENSE')),
  category text not null,
  description text not null,
  qty numeric(10,2),
  unit_price numeric(10,2),
  amount numeric(10,2) not null,
  unit_label text,
  source_type text check (source_type in ('POULTRY','VEGETABLES','RABBITRY','CANINE','OTHER')),
  source_ref_id text,
  date timestamptz not null,
  created_at timestamptz not null default now()
);
create index idx_finance_transactions_farm_id on finance_transactions(farm_id);

create or replace function public.farm_id()
returns text as $$
  select farm_id from users where id = auth.uid();
$$ language sql security definer stable;

alter table users enable row level security;
alter table poultry_batches enable row level security;
alter table egg_records enable row level security;
alter table incubations enable row level security;
alter table poultry_health enable row level security;
alter table vegetable_units enable row level security;
alter table vegetable_health enable row level security;
alter table rabbits enable row level security;
alter table rabbit_pairings enable row level security;
alter table dogs enable row level security;
alter table dog_heats enable row level security;
alter table finance_transactions enable row level security;

create policy "users_own_farm" on users for all using (farm_id = public.farm_id());
create policy "batches_own_farm" on poultry_batches for all using (farm_id = public.farm_id());
create policy "egg_records_own_farm" on egg_records for all using (farm_id = public.farm_id());
create policy "incubations_own_farm" on incubations for all using (farm_id = public.farm_id());
create policy "poultry_health_own_farm" on poultry_health for all using (farm_id = public.farm_id());
create policy "vegetable_units_own_farm" on vegetable_units for all using (farm_id = public.farm_id());
create policy "vegetable_health_own_farm" on vegetable_health for all using (farm_id = public.farm_id());
create policy "rabbits_own_farm" on rabbits for all using (farm_id = public.farm_id());
create policy "rabbit_pairings_own_farm" on rabbit_pairings for all using (farm_id = public.farm_id());
create policy "dogs_own_farm" on dogs for all using (farm_id = public.farm_id());
create policy "dog_heats_own_farm" on dog_heats for all using (farm_id = public.farm_id());
create policy "finance_transactions_own_farm" on finance_transactions for all using (farm_id = public.farm_id());
