import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { handle, archiveRow, applyArchiveFilter, json, HttpError } from '../_shared/auth.ts'
import { EggRecordSchema } from '../_shared/schemas.ts'

serve(handle(async (req, ctx) => {
  if (req.method === 'GET') {
    const { data, error } = await applyArchiveFilter(
      ctx.supabase.from('egg_records').select('*').order('date', { ascending: false }),
      req,
      ctx,
    )
    if (error) throw error
    return json(data)
  }

  if (req.method === 'POST') {
    const raw = await req.json()
    const parsed = EggRecordSchema.safeParse(raw)
    if (!parsed.success) throw new HttpError(400, JSON.stringify(parsed.error.flatten()))
    const body = parsed.data

    const { data, error } = await ctx.supabase
      .from('egg_records')
      .insert({ farm_id: ctx.farmId, count: Number(body.count), date: body.date })
      .select()
      .single()
    if (error) throw error
    return json(data)
  }

  if (req.method === 'DELETE') return archiveRow(req, ctx, 'egg_records')

  throw new HttpError(405, 'Method not allowed')
}))
