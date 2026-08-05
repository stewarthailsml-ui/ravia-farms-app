# Ravia Farms — Supabase Backend Migration Plan

**Status:** Ready for implementation
**Decision locked:** Option B (Edge Functions) + Option A (Supabase Auth) + Bearer header auth

---

## Prerequisite: Install Supabase CLI

Before running any migration steps, install the Supabase CLI:

**macOS / Linux:**
```bash
brew install supabase/tap/supabase
```

**Windows (PowerShell):**
```powershell
winget install Supabase.CLI
```

**Deno (cross-platform):**
```powershell
deno install -g -f npm:@supabase/cli@latest
```

Confirm install:
```bash
supabase --version
```

---

## Goal

Replace the entire backend layer with Supabase:
- Route Handlers → Supabase Edge Functions (Deno)
- Prisma + Neon → Supabase Postgres (SQL schema)
- NextAuth v4 + bcrypt → Supabase Auth (email/password)
- RLS replaces manual `farmId` filtering in every query

Frontend stays in Next.js App Router. Client calls Edge Functions by sending the user's Supabase Auth `access_token` as an `Authorization: Bearer <token>` header. RLS is the defense-in-depth safety net.

---

## 1. Pre-Migration

```bash
npm install @supabase/supabase-js@2 @supabase/ssr@0.1
```

Add to `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=<supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Remove from `.env.local`:
- `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `AUTH_SECRET`, `NEXTAUTH_URL`
- `SEED_EMAIL`, `SEED_PASSWORD`, `SEED_FARM_NAME`

Keep root `package.json` scripts. Update devDependencies later.

---

## 2. Database Migration (Supabase SQL Editor)

Drop Prisma migrations. Run this exact SQL in Supabase → SQL Editor:

```sql
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
  farm_id text not null references dogs(id) on delete cascade,
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
```

### 2.1 Security Definer Function

```sql
create or replace function auth.farm_id()
returns text as $$
  select farm_id from users where id = auth.uid();
$$ language sql security definer stable;
```

### 2.2 Enable RLS

```sql
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
```

### 2.3 RLS Policies

```sql
create policy "users_own_farm" on users for all using (farm_id = auth.farm_id());
create policy "batches_own_farm" on poultry_batches for all using (farm_id = auth.farm_id());
create policy "egg_records_own_farm" on egg_records for all using (farm_id = auth.farm_id());
create policy "incubations_own_farm" on incubations for all using (farm_id = auth.farm_id());
create policy "poultry_health_own_farm" on poultry_health for all using (farm_id = auth.farm_id());
create policy "vegetable_units_own_farm" on vegetable_units for all using (farm_id = auth.farm_id());
create policy "vegetable_health_own_farm" on vegetable_health for all using (farm_id = auth.farm_id());
create policy "rabbits_own_farm" on rabbits for all using (farm_id = auth.farm_id());
create policy "rabbit_pairings_own_farm" on rabbit_pairings for all using (farm_id = auth.farm_id());
create policy "dogs_own_farm" on dogs for all using (farm_id = auth.farm_id());
create policy "dog_heats_own_farm" on dog_heats for all using (farm_id = auth.farm_id());
create policy "finance_transactions_own_farm" on finance_transactions for all using (farm_id = auth.farm_id());
```

### 2.4 Seed Strategy

**Remove `/api/seed`.** Replace with one-time admin setup:

1. In Supabase Dashboard → Authentication → Users, create the owner user (`owner@ravia.farm` / `ravia1234`). Copy the UUID.
2. In SQL Editor, run:
   ```sql
   insert into farms (id, name) values ('default', 'Ravia Farms') on conflict (id) do nothing;
   insert into users (id, farm_id, email, name, role) values ('<owner-uuid>', 'default', 'owner@ravia.farm', 'Ravia Owner', 'OWNER');
   ```
3. Delete or rotate `SEED_PASSWORD` from anywhere it's documented.

---

## 3. Generate Types

```bash
npx supabase gen types typescript --project-id <project-id> > lib/database.types.ts
```

Use this generated type as the source of truth for all DB row types.

---

## 4. Edge Functions

Create `supabase/functions/` directory. Each function follows this pattern, using Bearer auth as primary:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('NEXT_PUBLIC_APP_URL') ?? 'http://localhost:3000',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

async function getUser(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) throw new Error('Missing Authorization')
  const token = authHeader.replace('Bearer ', '')
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase
    .from('users')
    .select('farm_id, role')
    .eq('id', user.id)
    .single()
  return { user, profile, supabase }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { user, profile, supabase } = await getUser(req)
    
    // domain-specific handler...
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: e.message === 'Unauthorized' ? 401 : 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  }
})
```

**Note:** If cross-origin cookie issues appear later, wrap this with cookie auth:
```typescript
const token = (authHeader?.replace('Bearer ', '')
  ?? req.headers.get('Cookie')?.match(/sb-[^-]+-auth-token=([^;]+)/)?.[1] ?? '')
```
But default to Bearer.

### 4.1 poultry/index.ts

- **GET** — `select * from poultry_batches order by deploy_date desc` (RLS scopes to farm)
- **POST** — validate with `PoultryBatchSchema`. Map breed string to DB value with `toUpperCase().replace(/\s+/g, '_')`. Insert batch, then auto-insert `EXPENSE / INITIAL_STOCK` finance transaction. Return created batch.

### 4.2 vegetables/index.ts

- **GET** — `select * from vegetable_units order by deploy_date desc`
- **POST** — validate with `VegetableUnitSchema`. Compute `stems = units * 84`. Insert unit, auto-insert expense. `crop_type` stored as display string directly.

### 4.3 rabbits/index.ts

- **GET** — `select * from rabbits order by acquired_date desc`
- **POST** — validate with `RabbitSchema`. Map `Doe (Female)` → `FEMALE`, `Buck (Male)` → `MALE`. Insert rabbit, auto-insert expense. Return created record.

### 4.4 dogs/index.ts

- **GET** — `select * from dogs order by acquired_date desc`
- **POST** — validate with `DogSchema` (**add `date` field to schema**). Insert dog with `acquired_date = body.date`. Auto-insert expense.

**Zod fix:**
```typescript
export const DogHeatSchema = z.object({
  dogId: z.string().min(1, "Dog is required"),
  date: dateString,
});
```

### 4.5 finance/index.ts

- **GET** — Query all `finance_transactions`. Compute summary in Deno:
  ```typescript
  const revenue = txns.filter(t => t.type === 'REVENUE').reduce((s, t) => s + Number(t.amount), 0)
  const expenses = txns.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0)
  return Response.json({ summary: { revenue, expenses, net: revenue - expenses }, transactions: txns })
  ```
- **POST** — Accept both `RevenueSchema` and `ExpenseSchema` by shape. Map `sourceType` from UI label. **Gap:** `sourceRefId` stays `null` because UI passes batch name, not id—track as follow-up.

---

## 5. Client Updates

### 5.1 `lib/supabase/server.ts`

```typescript
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function createServerSupabase() {
  const cookieStore = await cookies()
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        }
      }
    }
  )
}
```

### 5.2 `lib/supabase/client.ts`

```typescript
'use client'
import { createBrowserClient } from '@supabase/ssr'

export function createClientSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### 5.3 `lib/auth.ts` — Replace NextAuth with Supabase

```typescript
import { createServerSupabase } from '@/lib/supabase/server'

export async function getSession() {
  const supabase = await createServerSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function requireUser() {
  const session = await getSession()
  if (!session?.user) throw new Error('UNAUTHENTICATED')
  const { data: profile } = await (await createServerSupabase())
    .from('users')
    .select('role, farm_id')
    .eq('id', session.user.id)
    .single()
  return { id: session.user.id, email: session.user.email!, ...(profile ?? {}) }
}
```

### 5.4 `lib/api-client.ts` — Bearer-first fetch helper

```typescript
const BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    // Use Bearer header from client-side `createClientSupabase().auth.getSession()?.access_token`
    // or fall back to cookie if cross-origin requires it
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed: ${res.status}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(data) }),
}
```

Update `components/sections/use-ravia-data.ts` paths:
```typescript
queryFn: () => api.get<FinanceResponse>('finance'),
queryFn: () => api.get<PoultryBatchRow[]>('poultry'),
queryFn: () => api.get<VegetableUnitRow[]>('vegetables'),
queryFn: () => api.get<RabbitRow[]>('rabbits'),
queryFn: () => api.get<DogRow[]>('dogs'),
```

### 5.5 `app/auth/signin/page.tsx` — Replace NextAuth with Supabase Auth

Use `createClientSupabase()` + `supabase.auth.signInWithPassword({ email, password })`. On success, `router.push('/')` + `router.refresh()`.

### 5.6 `lib/schemas.ts` — Fix Weaknesses #13 and #15

- `DogHeatSchema`: Replace `name` with `dogId: z.string().min(1)`
- `DogSchema`: Add `date: dateString`
- Remove `BREED_MAP` / `CROP_MAP` exports from route handlers

---

## 6. Remove Legacy Code

Delete these files/directories:
- `prisma/` (entire directory)
- `app/api/*` (entire directory tree)
- `lib/db.ts`
- `lib/api.ts`

Update `package.json`:
- Remove: `@prisma/client`, `prisma`, `next-auth`, `@types/bcryptjs`, `bcryptjs`

Update `next.config.mjs`: Remove any Prisma-specific config. Ensure `eslint.ignoreDuringBuilds: true` is preserved.

---

## 7. Schema Fixes Applied

| Weakness | Fix Applied |
|---|---|
| RLS missing | Enabled on all 12 tables; auth.farm_id() policy |
| Dog ignoring date | `DogSchema` gains `date`; Edge Function uses `acquired_date = body.date` |
| RabbitPairing duplicates | `unique(farm_id, doe_id, buck_id, date)` added |
| sourceRefId no FK | Kept as text; documented as polymorphic gap |
| DogHeatSchema `name` | Removed; replaced with `dogId` |
| Breed/Crop enum maps | Eliminated; store display strings directly |
| Seed endpoint | Removed; replaced with admin SQL script |

---

## 8. Deployment Config

### Vercel
Add env vars:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`

### Supabase
Deploy Edge Functions:
```bash
supabase functions deploy poultry
supabase functions deploy vegetables
supabase functions deploy rabbits
supabase functions deploy dogs
supabase functions deploy finance
```

Set function secrets:
```bash
supabase secrets set NEXT_PUBLIC_APP_URL=https://ravia-farms.vercel.app
```

---

## 9. Validation Checklist

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `next build` succeeds (WSL-native install)
- [ ] Sign in with `owner@ravia.farm` / `ravia1234` works
- [ ] Bearer header is sent and accepted by Edge Functions
- [ ] Finance summary loads with correct totals
- [ ] Poultry batch creation auto-posts expense
- [ ] Vegetable unit creation auto-posts expense (stems = units × 84)
- [ ] Rabbit registration auto-posts expense
- [ ] Dog registration stores `acquired_date` from form (not `new Date()`)
- [ ] Creating duplicate `rabbit_pairings` is rejected
- [ ] Cross-farm data access is blocked (RLS test: user A cannot see user B's batches)
- [ ] No `prisma` or `next-auth` imports remain in source
- [ ] `npm run dev` runs without errors

---

## 10. Follow-Up (Out of Scope for This Migration)

- **Realtime subscriptions:** Subscribe to poultry/finance changes via `supabase.channel` for live dashboard updates
- **PUT/PATCH/DELETE routes:** Add update/delete operations to Edge Functions for batches, health records, transactions
- **User management UI:** Role assignment, farm switching, user invitations
- **Revenue source linking:** Replace `sourceRefId` with typed entity references once schema evolves
- **Offline sync:** Revisit PWA strategy with Supabase Realtime for field resilience
- **Cron / scheduled tasks:** Use Supabase Edge Functions cron or Vercel Cron for vaccination reminders

---

## Risk Summary

| Risk | Mitigation |
|---|---|
| Edge Function cold start latency | Deno runtime is fast; add loading states client-side |
| Cross-origin auth (Vercel → supabase.co) | Primary: Bearer header. Fallback: remove `credentials: 'include'` and rely on cookie via `Authorization` or CORS config |
| Existing PRD data loss | Run migration against fresh Supabase; old Neon data is snapshot-ready if needed |
| Seed endpoint removal breaking demo | Document new one-time SQL seed flow in README |

---

## Execution Order

1. Install Supabase CLI + `npm install @supabase/supabase-js@2 @supabase/ssr@0.1`
2. Create Supabase project + run SQL migration (Section 2)
3. Generate types (Section 3)
4. Scaffold Edge Functions (Section 4)
5. Create Supabase client utilities (Section 5.1–5.2)
6. Update sign-in page + `lib/auth.ts` (Section 5.3, 5.5)
7. Update `lib/api-client.ts` + hooks (Section 5.4, 5.5)
8. Fix Zod schemas (Section 5.6)
9. Delete legacy files + prune deps (Section 6)
10. Deploy Edge Functions (Section 8)
11. Run validation checklist (Section 9)
