import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { handle, archiveRow, applyArchiveFilter, json, HttpError } from '../_shared/auth.ts'
import { PoultryBatchSchema } from '../_shared/schemas.ts'

serve(handle(async (req, ctx) => {
  if (req.method === 'GET') {
    const { data, error } = await applyArchiveFilter(
      ctx.supabase.from('poultry_batches').select('*').order('deploy_date', { ascending: false }),
      req,
      ctx,
    )
    if (error) throw error
    return json(data)
  }

  if (req.method === 'POST') {
    const raw = await req.json()
    const parsed = PoultryBatchSchema.safeParse(raw)
    if (!parsed.success) throw new HttpError(400, JSON.stringify(parsed.error.flatten()))
    const body = parsed.data
    const qty = Number(body.count)
    const unitPrice = Number(body.unitPrice)
    const total = qty * unitPrice

    const { data: batch, error } = await ctx.supabase
      .from('poultry_batches')
      .insert({
        farm_id: ctx.farmId,
        name: body.name,
        breed: body.breed, // stored as-typed ("Sasso"), matching the spec's display
        source: body.source,
        count: qty,
        unit_price: unitPrice,
        deploy_date: body.date,
      })
      .select()
      .single()
    if (error) throw error

    const { error: finErr } = await ctx.supabase.from('finance_transactions').insert({
      farm_id: ctx.farmId,
      type: 'EXPENSE',
      category: 'Initial Stock/Purchase',
      description: `Purchase: Poultry Batch ${body.name} (Source: ${body.source})`,
      qty,
      unit_price: unitPrice,
      amount: total,
      unit_label: 'birds',
      source_type: 'POULTRY',
      source_ref_id: batch.id,
      date: new Date(body.date).toISOString(),
    })
    if (finErr) throw finErr

    return json(batch)
  }

  if (req.method === 'DELETE') return archiveRow(req, ctx, 'poultry_batches')

  throw new HttpError(405, 'Method not allowed')
}))
