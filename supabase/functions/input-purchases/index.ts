import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  handle,
  applyArchiveFilter,
  json,
  requireId,
  rpcError,
  HttpError,
} from '../_shared/auth.ts'
import { InputPurchaseSchema } from '../_shared/schemas.ts'

serve(handle(async (req, ctx) => {
  if (req.method === 'GET') {
    const { data, error } = await applyArchiveFilter(
      ctx.supabase
        .from('input_purchases')
        .select('*, input_items(name, category, unit_label)')
        .order('date', { ascending: false }),
      req,
      ctx,
    )
    if (error) throw error

    // Flatten the embedded item so the table can render a row without reaching
    // into a nested object — every other row type on the client is flat.
    // deno-lint-ignore no-explicit-any
    const rows = (data ?? []).map((p: any) => ({
      ...p,
      item_name: p.input_items?.name ?? 'Unknown input',
      item_category: p.input_items?.category ?? 'OTHER',
      unit_label: p.input_items?.unit_label ?? 'units',
      input_items: undefined,
    }))
    return json(rows)
  }

  if (req.method === 'POST') {
    const raw = await req.json()
    const parsed = InputPurchaseSchema.safeParse(raw)
    if (!parsed.success) throw new HttpError(400, JSON.stringify(parsed.error.flatten()))
    const b = parsed.data

    // One transactional call: the purchase, its EXPENSE in the P&L, and the
    // catalog's remembered supplier/price commit together or not at all.
    const { data, error } = await ctx.supabase.rpc('record_input_purchase', {
      p_item_id: b.itemId ?? null,
      p_new_name: b.newName ?? null,
      p_new_category: b.newCategory ?? null,
      p_new_unit_label: b.newUnitLabel ?? null,
      p_new_sector: b.newSector ?? null,
      p_supplier: b.supplier,
      p_qty: Number(b.qty),
      p_unit_price: Number(b.unitPrice),
      p_sector: b.sector,
      p_date: b.date,
      p_notes: b.notes || null,
    })
    if (error) rpcError(error)

    return json(data)
  }

  // Not archiveRow: the paired finance transaction has to be archived with it,
  // or the stock drops while a ghost expense keeps inflating the P&L.
  if (req.method === 'DELETE') {
    const { data, error } = await ctx.supabase.rpc('archive_input_purchase', {
      p_id: requireId(req),
    })
    if (error) rpcError(error)
    return json(data)
  }

  throw new HttpError(405, 'Method not allowed')
}))
