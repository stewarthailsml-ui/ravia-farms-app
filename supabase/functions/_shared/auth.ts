// Shared request context for every Ravia Farms Edge Function.
//
// The critical detail: the DB client MUST carry the caller's Authorization header.
// Without it every query runs as `anon`, so auth.uid() is NULL, public.farm_id()
// returns NULL, and RLS silently returns zero rows and rejects every insert.

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

export const ADMIN_ROLES = ['OWNER', 'MANAGER']

export const corsHeaders = {
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
  'Access-Control-Max-Age': '86400',
}

// A single hardcoded origin breaks every environment that isn't the one deployed
// with. Reflect the caller's Origin when it is on the allowlist instead.
// ALLOWED_ORIGINS (comma-separated) wins; otherwise the app URL + local dev.
const allowedOrigins = new Set(
  (Deno.env.get('ALLOWED_ORIGINS') ??
    [Deno.env.get('NEXT_PUBLIC_APP_URL'), 'http://localhost:3000', 'http://127.0.0.1:3000']
      .filter(Boolean).join(','))
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean),
)

function corsFor(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin')
  if (!origin) return { ...corsHeaders }
  const normalized = origin.replace(/\/$/, '')
  if (!allowedOrigins.has(normalized)) return { ...corsHeaders }
  return { ...corsHeaders, 'Access-Control-Allow-Origin': origin, Vary: 'Origin' }
}

/** Stamps the per-request CORS headers onto an already-built response. */
function withCors(res: Response, req: Request): Response {
  const headers = new Headers(res.headers)
  for (const [k, v] of Object.entries(corsFor(req))) headers.set(k, v)
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers })
}

export class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
  }
}

export interface Ctx {
  userId: string
  farmId: string
  role: string
  isAdmin: boolean
  supabase: SupabaseClient
}

export async function getCtx(req: Request): Promise<Ctx> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) throw new HttpError(401, 'Missing Authorization')

  // Request-scoped client bound to the caller's JWT so RLS applies as that user.
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const token = authHeader.replace(/^Bearer\s+/i, '')
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) throw new HttpError(401, 'Unauthorized')

  const { data: profile } = await supabase
    .from('users')
    .select('farm_id, role, archived_at')
    .eq('id', user.id)
    .maybeSingle()

  // A valid login with no profile row is not a 500 — it means the account was
  // never provisioned into a farm (or has been deactivated).
  if (!profile) throw new HttpError(403, 'No farm profile for this account')
  if (profile.archived_at) throw new HttpError(403, 'Account deactivated')

  return {
    userId: user.id,
    farmId: profile.farm_id,
    role: profile.role,
    isAdmin: ADMIN_ROLES.includes(profile.role),
    supabase,
  }
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

export function requireAdmin(ctx: Ctx): void {
  if (!ctx.isAdmin) {
    throw new HttpError(403, 'Only an admin (OWNER or MANAGER) may perform this action')
  }
}

/** True when the caller asked for archived rows — admin-only. */
export function wantsArchived(req: Request, ctx: Ctx): boolean {
  const flag = new URL(req.url).searchParams.get('archived') === 'true'
  if (flag) requireAdmin(ctx)
  return flag
}

// deno-lint-ignore no-explicit-any
type Query = any

/**
 * Toggles a list query between the live view (archived_at IS NULL, the default)
 * and the archived view (?archived=true, admin-only). Exclusive, not a union —
 * "Active" and "Archived" are two distinct views onto records that are never deleted.
 */
export function applyArchiveFilter(query: Query, req: Request, ctx: Ctx): Query {
  return wantsArchived(req, ctx)
    ? query.not('archived_at', 'is', null)
    : query.is('archived_at', null)
}

export function requireId(req: Request): string {
  const id = new URL(req.url).searchParams.get('id')
  if (!id) throw new HttpError(400, 'Missing id')
  return id
}

/**
 * Archive (never delete) a record. Admin-only, farm-scoped.
 * The row is retained with archived_at stamped.
 */
export async function archiveRow(req: Request, ctx: Ctx, table: string): Promise<Response> {
  requireAdmin(ctx)
  const id = requireId(req)
  const { data, error } = await ctx.supabase
    .from(table)
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
    .eq('farm_id', ctx.farmId)
    .is('archived_at', null)
    .select()
    .maybeSingle()
  if (error) throw error
  if (!data) throw new HttpError(404, 'Record not found or already archived')
  return json(data)
}

/**
 * Maps a PostgREST/plpgsql error onto an HTTP status.
 *
 * RPCs that raise deliberate business errors (`raise exception … using errcode`)
 * come back as ordinary errors, so without this a "not enough stock" or "not an
 * admin" reads as a 500 and the user is told the server broke rather than what
 * they did wrong. The codes are the ones the migrations raise by hand.
 */
// deno-lint-ignore no-explicit-any
export function rpcError(error: any): never {
  const status =
    error?.code === '42501' ? 403 // insufficient_privilege — no farm, or not an admin
    : error?.code === '42704' ? 404 // undefined_object — used for "not found"
    : error?.code === '22023' ? 400 // invalid_parameter_value — e.g. insufficient stock
    : error?.code === '23505' ? 409 // unique_violation
    : 500
  throw new HttpError(status, error?.message ?? 'Unexpected error')
}

/** Wraps a handler with CORS preflight + uniform error mapping. */
export function handle(fn: (req: Request, ctx: Ctx) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsFor(req) })
    try {
      const ctx = await getCtx(req)
      return withCors(await fn(req, ctx), req)
    } catch (e) {
      const err = e as Error
      const status = e instanceof HttpError ? e.status : 500
      return withCors(json({ error: err.message ?? 'Unexpected error' }, status), req)
    }
  }
}
