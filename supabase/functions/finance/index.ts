import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { handle, archiveRow, applyArchiveFilter, json, HttpError } from '../_shared/auth.ts'
import { ExpenseSchema, RevenueSchema } from '../_shared/schemas.ts'

const REVENUE_SOURCE: Record<string, string> = {
  Poultry: 'POULTRY',
  Vegetables: 'VEGETABLES',
  Rabbitry: 'RABBITRY',
  Canine: 'CANINE',
  Other: 'OTHER',
}

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
      const qty = Number(b.qty)
      const unitPrice = Number(b.unitPrice)
      const total = qty * unitPrice
      const sourceType = REVENUE_SOURCE[b.cat] ?? 'OTHER'
      const unitLabel = b.cat === 'Vegetables' ? 'stems' : b.cat === 'Poultry' ? 'items' : 'units'

      const { data, error } = await ctx.supabase
        .from('finance_transactions')
        .insert({
          farm_id: ctx.farmId,
          type: 'REVENUE',
          category: b.cat,
          description: b.batch + (b.desc ? ` - ${b.desc}` : ''),
          qty,
          unit_price: unitPrice,
          amount: total,
          unit_label: unitLabel,
          source_type: sourceType,
          source_ref_id: null,
          date: new Date(b.date).toISOString(),
        })
        .select()
        .single()
      if (error) throw error
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

  if (req.method === 'DELETE') return archiveRow(req, ctx, 'finance_transactions')

  throw new HttpError(405, 'Method not allowed')
}))
