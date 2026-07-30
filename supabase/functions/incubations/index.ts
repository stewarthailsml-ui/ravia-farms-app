import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { handle, archiveRow, applyArchiveFilter, json, HttpError } from '../_shared/auth.ts'
import { IncubationSchema } from '../_shared/schemas.ts'

serve(handle(async (req, ctx) => {
  if (req.method === 'GET') {
    const { data, error } = await applyArchiveFilter(
      ctx.supabase.from('incubations').select('*').order('date', { ascending: false }),
      req,
      ctx,
    )
    if (error) throw error
    return json(data)
  }

  if (req.method === 'POST') {
    const raw = await req.json()
    const parsed = IncubationSchema.safeParse(raw)
    if (!parsed.success) throw new HttpError(400, JSON.stringify(parsed.error.flatten()))
    const body = parsed.data

    const { data, error } = await ctx.supabase
      .from('incubations')
      .insert({ farm_id: ctx.farmId, count: Number(body.count), date: body.date })
      .select()
      .single()
    if (error) throw error
    return json(data)
  }

  if (req.method === 'DELETE') return archiveRow(req, ctx, 'incubations')

  throw new HttpError(405, 'Method not allowed')
}))
