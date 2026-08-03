import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { handle, archiveRow, applyArchiveFilter, json, HttpError } from '../_shared/auth.ts'
import { InputItemSchema } from '../_shared/schemas.ts'

serve(handle(async (req, ctx) => {
  if (req.method === 'GET') {
    // Everything the purchase and usage modals need in one round trip: the
    // catalog, the computed stock balances, and the supplier history that backs
    // the "remembered supplier" datalist.
    const { data: items, error } = await applyArchiveFilter(
      ctx.supabase.from('input_items').select('*').order('name'),
      req,
      ctx,
    )
    if (error) throw error

    const { data: stock, error: stockError } = await ctx.supabase
      .from('input_stock')
      .select('*')
      .order('name')
    if (stockError) throw stockError

    // Distinct suppliers, most recently used first. Derived from the purchase
    // history rather than kept in a suppliers table — a supplier here is a name
    // the farm has typed before, not an entity with its own lifecycle.
    const { data: purchases, error: supplierError } = await ctx.supabase
      .from('input_purchases')
      .select('supplier, date')
      .is('archived_at', null)
      .order('date', { ascending: false })
    if (supplierError) throw supplierError

    const suppliers = [...new Set((purchases ?? []).map((p) => p.supplier).filter(Boolean))]

    return json({ items, stock: stock ?? [], suppliers })
  }

  if (req.method === 'POST') {
    const raw = await req.json()
    const parsed = InputItemSchema.safeParse(raw)
    if (!parsed.success) throw new HttpError(400, JSON.stringify(parsed.error.flatten()))
    const b = parsed.data

    const { data, error } = await ctx.supabase
      .from('input_items')
      .insert({
        farm_id: ctx.farmId,
        name: b.name,
        category: b.category,
        sector: b.sector,
        unit_label: b.unitLabel,
      })
      .select()
      .single()
    // The (farm_id, lower(name)) unique index is the guard against a duplicate
    // catalog entry splitting one input's stock across two rows.
    if (error?.code === '23505') throw new HttpError(409, `"${b.name}" is already in the input catalog`)
    if (error) throw error
    return json(data)
  }

  if (req.method === 'DELETE') return archiveRow(req, ctx, 'input_items')

  throw new HttpError(405, 'Method not allowed')
}))
