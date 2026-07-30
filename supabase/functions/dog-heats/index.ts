import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { handle, archiveRow, applyArchiveFilter, json, HttpError } from '../_shared/auth.ts'
import { DogHeatSchema } from '../_shared/schemas.ts'

// deno-lint-ignore no-explicit-any
function flatten(row: any) {
  const { dogs, ...rest } = row
  return { ...rest, dog_name: dogs?.name ?? null }
}

serve(handle(async (req, ctx) => {
  if (req.method === 'GET') {
    const { data, error } = await applyArchiveFilter(
      ctx.supabase.from('dog_heats').select('*, dogs(name)').order('date', { ascending: false }),
      req,
      ctx,
    )
    if (error) throw error
    return json(data.map(flatten))
  }

  if (req.method === 'POST') {
    const raw = await req.json()
    const parsed = DogHeatSchema.safeParse(raw)
    if (!parsed.success) throw new HttpError(400, JSON.stringify(parsed.error.flatten()))
    const body = parsed.data

    // dog_id is an FK to `dogs` with no farm scoping of its own — confirm it
    // belongs to the caller's farm before logging against it.
    const { data: dog, error: dogErr } = await ctx.supabase
      .from('dogs')
      .select('id')
      .eq('farm_id', ctx.farmId)
      .eq('id', body.dogId)
      .maybeSingle()
    if (dogErr) throw dogErr
    if (!dog) throw new HttpError(400, 'Dog must be an existing dog on this farm')

    const { data, error } = await ctx.supabase
      .from('dog_heats')
      .insert({ farm_id: ctx.farmId, dog_id: body.dogId, date: body.date })
      .select('*, dogs(name)')
      .single()
    if (error) throw error
    return json(flatten(data))
  }

  if (req.method === 'DELETE') return archiveRow(req, ctx, 'dog_heats')

  throw new HttpError(405, 'Method not allowed')
}))
