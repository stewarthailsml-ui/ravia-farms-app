import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { handle, archiveRow, applyArchiveFilter, json, HttpError } from '../_shared/auth.ts'
import { PoultryHealthSchema } from '../_shared/schemas.ts'

serve(handle(async (req, ctx) => {
  if (req.method === 'GET') {
    const { data, error } = await applyArchiveFilter(
      ctx.supabase.from('poultry_health').select('*').order('date', { ascending: false }),
      req,
      ctx,
    )
    if (error) throw error
    return json(data)
  }

  if (req.method === 'POST') {
    const raw = await req.json()
    const parsed = PoultryHealthSchema.safeParse(raw)
    if (!parsed.success) throw new HttpError(400, JSON.stringify(parsed.error.flatten()))
    const body = parsed.data

    const { data, error } = await ctx.supabase
      .from('poultry_health')
      .insert({
        farm_id: ctx.farmId,
        batch_id: body.batchId || null,
        batch_name: body.batch,
        issue: body.issue,
        affected: Number(body.affected),
        mortality: Number(body.mortality),
        rx: body.rx || null,
        photo_url: body.photoUrl || null,
        date: new Date().toISOString(),
      })
      .select()
      .single()
    if (error) throw error
    return json(data)
  }

  if (req.method === 'DELETE') return archiveRow(req, ctx, 'poultry_health')

  throw new HttpError(405, 'Method not allowed')
}))
