const FUNCTIONS_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

// Resolve the caller's access token. Must be awaited — an unawaited Promise here
// serialises into the header as "[object Promise]" and 401s every request.
async function accessToken(): Promise<string | undefined> {
  if (typeof window === 'undefined') return undefined
  const { createClientSupabase } = await import('@/lib/supabase/client')
  const { data } = await createClientSupabase().auth.getSession()
  return data.session?.access_token
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await accessToken()
  return {
    'Content-Type': 'application/json',
    // The Supabase gateway requires `apikey` in addition to the user JWT.
    apikey: ANON_KEY,
    Authorization: `Bearer ${token ?? ANON_KEY}`,
  }
}

// Accepts 'finance' or '/finance' — callers use both.
function url(path: string, query?: Record<string, string | undefined>): string {
  const base = `${FUNCTIONS_BASE}/${path.replace(/^\/+/, '')}`
  const entries = Object.entries(query ?? {}).filter(
    (e): e is [string, string] => e[1] !== undefined,
  )
  if (entries.length === 0) return base
  return `${base}?${new URLSearchParams(entries).toString()}`
}

async function parse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { error?: string })
    throw new Error(body.error || `Request failed: ${res.status}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  get: async <T>(path: string, query?: Record<string, string | undefined>): Promise<T> =>
    parse<T>(await fetch(url(path, query), { headers: await authHeaders() })),

  post: async <T>(path: string, data: unknown): Promise<T> =>
    parse<T>(
      await fetch(url(path), {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(data),
      }),
    ),

  patch: async <T>(path: string, data: unknown): Promise<T> =>
    parse<T>(
      await fetch(url(path), {
        method: 'PATCH',
        headers: await authHeaders(),
        body: JSON.stringify(data),
      }),
    ),

  // Archives (soft-deletes) a record. Admin-only server-side; never removes the row.
  archive: async <T>(path: string, id: string): Promise<T> =>
    parse<T>(
      await fetch(url(path, { id }), {
        method: 'DELETE',
        headers: await authHeaders(),
      }),
    ),
}

export type Role = 'OWNER' | 'MANAGER' | 'FARM_HAND' | 'VET'

export const ADMIN_ROLES: Role[] = ['OWNER', 'MANAGER']

export interface Profile {
  id: string
  email: string
  name: string | null
  role: Role
  farm_id: string
  archived_at: string | null
}

export interface FinanceSummary {
  revenue: number
  expenses: number
  net: number
}

export interface FinanceTxn {
  id: string
  type: 'REVENUE' | 'EXPENSE'
  category: string
  description: string
  qty: number | null
  unit_price: number | null
  amount: number
  unit_label: string | null
  // Which sector the money belongs to. NULL on legacy manual expenses entered
  // before the inputs module; every auto-posted row carries it.
  source_type: 'POULTRY' | 'VEGETABLES' | 'RABBITRY' | 'CANINE' | 'OTHER' | null
  source_ref_id: string | null
  date: string
  archived_at: string | null
}

export interface FinanceResponse {
  summary: FinanceSummary
  transactions: FinanceTxn[]
}

// `count` is the deploy count and never changes. Everything a reader actually
// wants to know about the flock today lives in the computed fields below, merged
// on from the poultry_stock view by the Edge Function.
export interface PoultryBatchRow {
  id: string
  name: string
  breed: string
  source: string
  count: number
  unit_price: number
  deploy_date: string
  archived_at: string | null
  deployed: number
  mortality: number
  sold: number
  on_hand: number
}

export interface EggRecordRow {
  id: string
  count: number
  date: string
  archived_at: string | null
}

export interface IncubationRow {
  id: string
  count: number
  date: string
  archived_at: string | null
}

export interface PoultryHealthRow {
  id: string
  batch_id: string | null
  batch_name: string
  issue: string
  affected: number
  mortality: number
  rx: string | null
  photo_url: string | null
  date: string
  archived_at: string | null
}

// `stems` is what was planted; on_hand is what is left after losses and sales.
export interface VegetableUnitRow {
  id: string
  crop_type: string
  source: string
  units: number
  price_per_stem: number
  stems: number
  deploy_date: string
  archived_at: string | null
  deployed: number
  loss: number
  sold: number
  on_hand: number
}

export interface VegetableHealthRow {
  id: string
  unit_id: string | null
  batch_name: string
  issue: string
  affected: number
  loss: number
  rx: string | null
  photo_url: string | null
  date: string
  archived_at: string | null
}

// sold_at, not a decrement: an individual animal's stock is its presence, so a
// sale is a state change. The record stays for its breeding/health history.
export interface RabbitRow {
  id: string
  tag_id: string
  breed: string
  sex: string
  source: string
  price: number
  acquired_date: string
  archived_at: string | null
  sold_at: string | null
}

export interface RabbitPairingRow {
  id: string
  doe_id: string
  buck_id: string
  doe_tag: string
  buck_tag: string
  date: string
  archived_at: string | null
}

export interface DogRow {
  id: string
  name: string
  breed: string
  sex: string
  source: string
  price: number
  pedigree: string | null
  acquired_date: string
  archived_at: string | null
  sold_at: string | null
}

export interface DogHeatRow {
  id: string
  dog_id: string
  dog_name: string
  date: string
  archived_at: string | null
}

// ---------- Inputs & Stock ----------
export type InputCategory = 'FEED' | 'VACCINE' | 'PESTICIDE' | 'MEDICAL' | 'EQUIPMENT' | 'OTHER'
export type InputSector = 'POULTRY' | 'VEGETABLES' | 'RABBITRY' | 'CANINE' | 'GENERAL'

export interface InputItemRow {
  id: string
  name: string
  category: InputCategory
  sector: InputSector
  unit_label: string
  last_supplier: string | null
  last_unit_price: number | null
  archived_at: string | null
}

// From the input_stock view — `on_hand` is computed (purchased - used), never
// stored, so archiving a bad purchase corrects it with no reconciliation.
export interface InputStockRow {
  item_id: string
  name: string
  category: InputCategory
  sector: InputSector
  unit_label: string
  last_supplier: string | null
  last_unit_price: number | null
  purchased: number
  used: number
  on_hand: number
  total_spent: number
  last_purchase_date: string | null
}

export interface InputsResponse {
  items: InputItemRow[]
  stock: InputStockRow[]
  suppliers: string[]
}

export interface InputPurchaseRow {
  id: string
  item_id: string
  item_name: string
  item_category: InputCategory
  unit_label: string
  supplier: string
  qty: number
  unit_price: number
  amount: number
  sector: InputSector
  date: string
  finance_txn_id: string | null
  notes: string | null
  archived_at: string | null
}

// ---------- Sales ----------
// The stock-out ledger. Every row is paired 1:1 with a REVENUE transaction
// (finance_txn_id), written by record_sale in the same transaction.
export type StockKind = 'POULTRY_BIRDS' | 'EGGS' | 'VEGETABLE_STEMS' | 'RABBIT' | 'DOG' | 'NONE'

export interface SaleRow {
  id: string
  sector: InputSector
  stock_kind: StockKind
  source_ref_id: string | null
  qty: number
  unit_price: number
  amount: number
  unit_label: string
  customer: string | null
  date: string
  finance_txn_id: string | null
  notes: string | null
  archived_at: string | null
}

// From the egg_stock view — farm-wide, since eggs are not tied to a batch.
// Incubation is netted here because setting eggs genuinely consumes them.
export interface EggStock {
  farm_id: string
  laid: number
  incubated: number
  sold: number
  on_hand: number
}

// One administered dose: a Silverlands schedule point actually carried out on a
// batch. Keyed by (farm_id, batch_id, sched_day) so a point is recorded once.
export interface BatchVaccinationRow {
  id: string
  farm_id: string
  batch_id: string | null
  sched_day: number
  task: string
  given_at: string
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface InputUsageRow {
  id: string
  item_id: string
  item_name: string
  item_category: InputCategory
  unit_label: string
  qty: number
  sector: InputSector
  date: string
  notes: string | null
  source_module: string | null
  source_ref_id: string | null
  archived_at: string | null
}
