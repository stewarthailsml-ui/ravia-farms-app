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

    // Merge the computed balance onto each batch rather than exposing a separate
    // endpoint: `count` is the deploy count and always has been, so every caller
    // that wants "how many birds are actually there" needs on_hand alongside it.
    // Archived batches drop out of the view, hence the fall back to the raw count.
    const { data: stock, error: stockError } = await ctx.supabase.from('poultry_stock').select('*')
    if (stockError) throw stockError
    // deno-lint-ignore no-explicit-any
    const byBatch = new Map((stock ?? []).map((s: any) => [s.batch_id, s]))

    // deno-lint-ignore no-explicit-any
    const rows = (data ?? []).map((b: any) => {
      const s = byBatch.get(b.id)
      return {
        ...b,
        deployed: b.count,
        mortality: Number(s?.mortality ?? 0),
        sold: Number(s?.sold ?? 0),
        on_hand: Number(s?.on_hand ?? b.count),
      }
    })
    return json(rows)
  }

  if (req.method === 'POST') {
    const raw = await req.json()
    const parsed = PoultryBatchSchema.safeParse(raw)
    if (!parsed.success) throw new HttpError(400, JSON.stringify(parsed.error.flatten()))
    const body = parsed.data

    // Single transactional call: the batch and its purchase expense commit
    // together or not at all. Two separate inserts here used to be able to leave
    // a committed batch with no expense while the caller saw an outright failure.
    const { data: batch, error } = await ctx.supabase.rpc('deploy_poultry_batch', {
      p_name: body.name,
      p_breed: body.breed, // stored as-typed ("Sasso"), matching the spec's display
      p_source: body.source,
      p_count: Number(body.count),
      p_unit_price: Number(body.unitPrice),
      p_date: body.date,
    })
    if (error) throw error

    return json(batch)
  }

  if (req.method === 'DELETE') return archiveRow(req, ctx, 'poultry_batches')

  throw new HttpError(405, 'Method not allowed')
}))
