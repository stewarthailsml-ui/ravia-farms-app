import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { handle, archiveRow, applyArchiveFilter, json, HttpError } from '../_shared/auth.ts'
import { RabbitPairingSchema } from '../_shared/schemas.ts'

// deno-lint-ignore no-explicit-any
function flatten(row: any) {
  const { doe, buck, ...rest } = row
  return { ...rest, doe_tag: doe?.tag_id ?? null, buck_tag: buck?.tag_id ?? null }
}

serve(handle(async (req, ctx) => {
  if (req.method === 'GET') {
    const { data, error } = await applyArchiveFilter(
      ctx.supabase
        .from('rabbit_pairings')
        .select('*, doe:rabbits!rabbit_pairings_doe_id_fkey(tag_id), buck:rabbits!rabbit_pairings_buck_id_fkey(tag_id)')
        .order('date', { ascending: false }),
      req,
      ctx,
    )
    if (error) throw error
    return json(data.map(flatten))
  }

  if (req.method === 'POST') {
    const raw = await req.json()
    const parsed = RabbitPairingSchema.safeParse(raw)
    if (!parsed.success) throw new HttpError(400, JSON.stringify(parsed.error.flatten()))
    const body = parsed.data

    // doe_id/buck_id are FKs to `rabbits` with no farm scoping of their own —
    // confirm both belong to the caller's farm so a pairing can't be created
    // against another farm's animal.
    const { data: parents, error: parentErr } = await ctx.supabase
      .from('rabbits')
      .select('id')
      .eq('farm_id', ctx.farmId)
      .in('id', [body.doeId, body.buckId])
    if (parentErr) throw parentErr
    if ((parents?.length ?? 0) !== 2) throw new HttpError(400, 'Doe/Buck must be existing rabbits on this farm')

    const { data, error } = await ctx.supabase
      .from('rabbit_pairings')
      .insert({ farm_id: ctx.farmId, doe_id: body.doeId, buck_id: body.buckId, date: body.date })
      .select('*, doe:rabbits!rabbit_pairings_doe_id_fkey(tag_id), buck:rabbits!rabbit_pairings_buck_id_fkey(tag_id)')
      .single()
    if (error) throw error
    return json(flatten(data))
  }

  if (req.method === 'DELETE') return archiveRow(req, ctx, 'rabbit_pairings')

  throw new HttpError(405, 'Method not allowed')
}))
