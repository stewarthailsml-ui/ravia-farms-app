import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { handle, archiveRow, applyArchiveFilter, json, HttpError } from '../_shared/auth.ts'
import { VegetableUnitSchema } from '../_shared/schemas.ts'

serve(handle(async (req, ctx) => {
  if (req.method === 'GET') {
    const { data, error } = await applyArchiveFilter(
      ctx.supabase.from('vegetable_units').select('*').order('deploy_date', { ascending: false }),
      req,
      ctx,
    )
    if (error) throw error

    // Same merge as the poultry endpoint: `stems` is what was planted, on_hand is
    // what is left after losses and sales. See poultry/index.ts for the rationale.
    const { data: stock, error: stockError } = await ctx.supabase.from('vegetable_stock').select('*')
    if (stockError) throw stockError
    // deno-lint-ignore no-explicit-any
    const byUnit = new Map((stock ?? []).map((s: any) => [s.unit_id, s]))

    // deno-lint-ignore no-explicit-any
    const rows = (data ?? []).map((v: any) => {
      const s = byUnit.get(v.id)
      return {
        ...v,
        deployed: v.stems,
        loss: Number(s?.loss ?? 0),
        sold: Number(s?.sold ?? 0),
        on_hand: Number(s?.on_hand ?? v.stems),
      }
    })
    return json(rows)
  }

  if (req.method === 'POST') {
    const raw = await req.json()
    const parsed = VegetableUnitSchema.safeParse(raw)
    if (!parsed.success) throw new HttpError(400, JSON.stringify(parsed.error.flatten()))
    const body = parsed.data

    // Single transactional call — see deploy_poultry_batch for the rationale.
    // The 84-stems-per-unit conversion now lives in the RPC alongside the writes.
    const { data: unit, error } = await ctx.supabase.rpc('deploy_vegetable_unit', {
      p_type: body.type,
      p_source: body.source,
      p_units: Number(body.units),
      p_price_per_stem: Number(body.pricePerStem),
      p_date: body.date,
    })
    if (error) throw error

    return json(unit)
  }

  if (req.method === 'DELETE') return archiveRow(req, ctx, 'vegetable_units')

  throw new HttpError(405, 'Method not allowed')
}))
