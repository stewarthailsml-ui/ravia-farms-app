import { prisma } from "@/lib/db";
import { withHandler } from "@/lib/api";
import { ExpenseSchema, RevenueSchema } from "@/lib/schemas";

// Map UI revenue category ("Poultry") → DB RevenueCategory enum ("POULTRY").
const REVENUE_SOURCE: Record<string, "POULTRY" | "VEGETABLES" | "RABBITRY" | "CANINE" | "OTHER"> = {
  Poultry: "POULTRY",
  Vegetables: "VEGETABLES",
  Rabbitry: "RABBITRY",
  Canine: "CANINE",
  Other: "OTHER",
};

// Unified finance endpoint:
//  - GET  → { summary: {revenue, expenses, net}, transactions: [...] }
//  - POST revenue (RevenueSchema) — links back to the originating batch via sourceRefId
//  - POST expense (ExpenseSchema)
export const GET = withHandler(null, async (_body, user) => {
  const txns = await prisma.financeTransaction.findMany({
    where: { farmId: user.farmId },
    orderBy: { date: "desc" },
  });

  const revenue = txns
    .filter((t) => t.type === "REVENUE")
    .reduce((a, t) => a + Number(t.amount), 0);
  const expenses = txns
    .filter((t) => t.type === "EXPENSE")
    .reduce((a, t) => a + Number(t.amount), 0);

  return {
    summary: { revenue, expenses, net: revenue - expenses },
    transactions: txns,
  };
});

export const POST = withHandler(null, async (raw: any, user) => {
  const isRevenue =
    raw && raw.qty !== undefined && raw.unitPrice !== undefined && raw.batch !== undefined;

  if (isRevenue) {
    const parsed = RevenueSchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Validation failed", issues: parsed.error.flatten() }),
        { status: 400 },
      );
    }
    const b = parsed.data;
    const qty = Number(b.qty);
    const unitPrice = Number(b.unitPrice);
    const total = qty * unitPrice;
    const sourceType = REVENUE_SOURCE[b.cat] ?? "OTHER";
    const unitLabel =
      b.cat === "Vegetables" ? "stems" : b.cat === "Poultry" ? "items" : "units";

    const created = await prisma.financeTransaction.create({
      data: {
        farmId: user.farmId,
        type: "REVENUE",
        category: b.cat,
        description: b.batch + (b.desc ? ` - ${b.desc}` : ""),
        qty,
        unitPrice,
        amount: total,
        unitLabel,
        sourceType,
        sourceRefId: null, // UI passes batch name; linking to id is a later enhancement
        date: new Date(b.date),
      },
    });
    return created;
  }

  const parsed = ExpenseSchema.safeParse(raw);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Validation failed", issues: parsed.error.flatten() }),
      { status: 400 },
    );
  }
  const b = parsed.data;
  const created = await prisma.financeTransaction.create({
    data: {
      farmId: user.farmId,
      type: "EXPENSE",
      category: b.cat,
      description: b.desc,
      qty: 1,
      unitPrice: Number(b.amount),
      amount: Number(b.amount),
      unitLabel: "units",
      date: new Date(b.date),
    },
  });
  return created;
});
