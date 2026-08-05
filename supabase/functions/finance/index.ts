import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { handle, applyArchiveFilter, json, requireId, rpcError, HttpError } from '../_shared/auth.ts'
import { ExpenseSchema, RevenueSchema, REVENUE_SECTOR } from '../_shared/schemas.ts'

serve(handle(async (req, ctx) => {
  if (req.method === 'GET') {
    const { data, error } = await applyArchiveFilter(
      ctx.supabase.from('finance_transactions').select('*').order('date', { ascending: false }),
      req,
      ctx,
    )
    if (error) throw error

    // Aggregates reflect whichever set was requested (live by default), so an
    // archived transaction can never silently skew the operating P&L.
    const revenue = data.filter((t) => t.type === 'REVENUE').reduce((s, t) => s + Number(t.amount), 0)
    const expenses = data.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0)

    return json({ summary: { revenue, expenses, net: revenue - expenses }, transactions: data })
  }

  if (req.method === 'POST') {
    const raw = await req.json()

    if (raw?.type === 'revenue') {
      const parsed = RevenueSchema.safeParse(raw)
      if (!parsed.success) throw new HttpError(400, JSON.stringify(parsed.error.flatten()))
      const b = parsed.data

      // One transactional call instead of a bare insert: the sale, the stock it
      // draws down and the REVENUE row commit together or not at all, and the
      // RPC refuses to oversell before either row exists. The unit label is no
      // longer guessed from the category here — the RPC knows what was sold.
      const { data, error } = await ctx.supabase.rpc('record_sale', {
        p_sector: REVENUE_SECTOR[b.cat] ?? 'GENERAL',
        p_stock_kind: b.stockKind,
        p_source_ref_id: b.sourceId ?? null,
        p_qty: Number(b.qty),
        p_unit_price: Number(b.unitPrice),
        p_unit_label: b.unitLabel ?? null,
        p_customer: b.customer || null,
        p_date: b.date,
        p_notes: b.desc || null,
      })
      if (error) rpcError(error)
      return json(data)
    }

    const parsed = ExpenseSchema.safeParse(raw)
    if (!parsed.success) throw new HttpError(400, JSON.stringify(parsed.error.flatten()))
    const b = parsed.data

    // Feed carries a real qty/unit-price breakdown (bags @ price/bag); every
    // other category is a flat manual amount — this is the spec's "[qty] [unit]
    // @ [price] = [total]" transaction-history line, previously dropped.
    const isFeed = b.cat === 'Feed'
    const qty = isFeed ? Number(b.bags) : 1
    const unitPrice = isFeed ? Number(b.pricePerBag) : Number(b.amount)
    const amount = isFeed ? qty * unitPrice : Number(b.amount)
    const unitLabel = isFeed ? 'bags' : 'units'

    const { data, error } = await ctx.supabase
      .from('finance_transactions')
      .insert({
        farm_id: ctx.farmId,
        type: 'EXPENSE',
        category: b.cat,
        description: b.desc,
        qty,
        unit_price: unitPrice,
        amount,
        unit_label: unitLabel,
        date: new Date(b.date).toISOString(),
      })
      .select()
      .single()
    if (error) throw error
    return json(data)
  }

  // Not archiveRow: a REVENUE row is one half of a sale and an EXPENSE may be one
  // half of an input purchase. Archiving the transaction alone would leave the
  // stock movement standing — the sold birds would never come back.
  if (req.method === 'DELETE') {
    const { data, error } = await ctx.supabase.rpc('archive_finance_transaction', {
      p_id: requireId(req),
    })
    if (error) rpcError(error)
    return json(data)
  }

  throw new HttpError(405, 'Method not allowed')
}))
