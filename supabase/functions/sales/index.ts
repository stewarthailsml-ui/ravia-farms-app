import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { handle, applyArchiveFilter, json, requireId, rpcError, HttpError } from '../_shared/auth.ts'

// Read-only companion to the finance function, which is where sales are created
// (a sale IS the revenue entry — see record_sale). This endpoint exists so the
// stock-out ledger can be listed and archived on its own terms.
serve(handle(async (req, ctx) => {
  if (req.method === 'GET') {
    const { data, error } = await applyArchiveFilter(
      ctx.supabase.from('sales').select('*').order('date', { ascending: false }),
      req,
      ctx,
    )
    if (error) throw error
    return json(data)
  }

  // Not archiveRow: the paired REVENUE has to be archived with it, or the stock
  // comes back while a ghost revenue keeps inflating the P&L.
  if (req.method === 'DELETE') {
    const { data, error } = await ctx.supabase.rpc('archive_sale', { p_id: requireId(req) })
    if (error) rpcError(error)
    return json(data)
  }

  throw new HttpError(405, 'Method not allowed')
}))
