import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { handle, archiveRow, applyArchiveFilter, json, rpcError, HttpError } from '../_shared/auth.ts'
import { InputUsageSchema } from '../_shared/schemas.ts'

serve(handle(async (req, ctx) => {
  if (req.method === 'GET') {
    const { data, error } = await applyArchiveFilter(
      ctx.supabase
        .from('input_usage')
        .select('*, input_items(name, category, unit_label)')
        .order('date', { ascending: false }),
      req,
      ctx,
    )
    if (error) throw error

    // deno-lint-ignore no-explicit-any
    const rows = (data ?? []).map((u: any) => ({
      ...u,
      item_name: u.input_items?.name ?? 'Unknown input',
      item_category: u.input_items?.category ?? 'OTHER',
      unit_label: u.input_items?.unit_label ?? 'units',
      input_items: undefined,
    }))
    return json(rows)
  }

  if (req.method === 'POST') {
    const raw = await req.json()
    const parsed = InputUsageSchema.safeParse(raw)
    if (!parsed.success) throw new HttpError(400, JSON.stringify(parsed.error.flatten()))
    const b = parsed.data

    // Through the RPC rather than a plain insert: it is what enforces the
    // stock-cannot-go-negative check against the computed balance.
    const { data, error } = await ctx.supabase.rpc('record_input_usage', {
      p_item_id: b.itemId,
      p_qty: Number(b.qty),
      p_sector: b.sector,
      p_date: b.date,
      p_notes: b.notes || null,
      p_source_module: b.sourceModule ?? null,
      p_source_ref_id: b.sourceRefId ?? null,
    })
    if (error) rpcError(error)

    return json(data)
  }

  // Usage posts no finance row, so the generic archive is correct here — the
  // balance corrects itself the moment the row leaves the live view.
  if (req.method === 'DELETE') return archiveRow(req, ctx, 'input_usage')

  throw new HttpError(405, 'Method not allowed')
}))
