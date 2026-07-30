import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { handle, archiveRow, applyArchiveFilter, json, HttpError } from '../_shared/auth.ts'
import { RabbitSchema } from '../_shared/schemas.ts'

serve(handle(async (req, ctx) => {
  if (req.method === 'GET') {
    const { data, error } = await applyArchiveFilter(
      ctx.supabase.from('rabbits').select('*').order('acquired_date', { ascending: false }),
      req,
      ctx,
    )
    if (error) throw error
    return json(data)
  }

  if (req.method === 'POST') {
    const raw = await req.json()
    const parsed = RabbitSchema.safeParse(raw)
    if (!parsed.success) throw new HttpError(400, JSON.stringify(parsed.error.flatten()))
    const body = parsed.data
    const price = Number(body.price)

    const { data: rabbit, error } = await ctx.supabase
      .from('rabbits')
      .insert({
        farm_id: ctx.farmId,
        tag_id: body.name,
        breed: body.breed,
        sex: body.sex, // stored as-typed ("Doe (Female)"), matching the spec's display
        source: body.source,
        price,
        acquired_date: body.date,
      })
      .select()
      .single()
    if (error) throw error

    const { error: finErr } = await ctx.supabase.from('finance_transactions').insert({
      farm_id: ctx.farmId,
      type: 'EXPENSE',
      category: 'Initial Stock/Purchase',
      description: `Purchase: Rabbit ${body.name} (Source: ${body.source})`,
      qty: 1,
      unit_price: price,
      amount: price,
      unit_label: 'rabbit',
      source_type: 'RABBITRY',
      source_ref_id: rabbit.id,
      date: new Date(body.date).toISOString(),
    })
    if (finErr) throw finErr

    return json(rabbit)
  }

  if (req.method === 'DELETE') return archiveRow(req, ctx, 'rabbits')

  throw new HttpError(405, 'Method not allowed')
}))
