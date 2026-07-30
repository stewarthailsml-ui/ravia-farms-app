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
    return json(data)
  }

  if (req.method === 'POST') {
    const raw = await req.json()
    const parsed = VegetableUnitSchema.safeParse(raw)
    if (!parsed.success) throw new HttpError(400, JSON.stringify(parsed.error.flatten()))
    const body = parsed.data
    const units = Number(body.units)
    const pricePerStem = Number(body.pricePerStem)
    const stems = units * 84
    const total = stems * pricePerStem

    const { data: unit, error } = await ctx.supabase
      .from('vegetable_units')
      .insert({
        farm_id: ctx.farmId,
        crop_type: body.type,
        source: body.source,
        units,
        price_per_stem: pricePerStem,
        stems,
        deploy_date: body.date,
      })
      .select()
      .single()
    if (error) throw error

    const { error: finErr } = await ctx.supabase.from('finance_transactions').insert({
      farm_id: ctx.farmId,
      type: 'EXPENSE',
      category: 'Initial Stock/Purchase',
      description: `Purchase: Vegetable Unit ${body.type} (Source: ${body.source})`,
      qty: stems,
      unit_price: pricePerStem,
      amount: total,
      unit_label: 'stems',
      source_type: 'VEGETABLES',
      source_ref_id: unit.id,
      date: new Date(body.date).toISOString(),
    })
    if (finErr) throw finErr

    return json(unit)
  }

  if (req.method === 'DELETE') return archiveRow(req, ctx, 'vegetable_units')

  throw new HttpError(405, 'Method not allowed')
}))
