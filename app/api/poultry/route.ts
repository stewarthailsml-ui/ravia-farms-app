import { prisma } from "@/lib/db";
import { withHandler } from "@/lib/api";
import { PoultryBatchSchema } from "@/lib/schemas";

const BREED_MAP: Record<string, any> = {
  Sasso: "SASSO",
  Kienyeji: "KIENYEJI",
  Layers: "LAYERS",
  Broilers: "BROILERS",
};

export const POST = withHandler(PoultryBatchSchema, async (body, user) => {
  const qty = Number(body.count);
  const unitPrice = Number(body.unitPrice);
  const total = qty * unitPrice;

  const batch = await prisma.$transaction(async (tx) => {
    const created = await tx.poultryBatch.create({
      data: {
        farmId: user.farmId,
        name: body.name,
        breed: BREED_MAP[body.breed],
        source: body.source,
        count: qty,
        unitPrice: unitPrice,
        deployDate: new Date(body.date),
      },
    });
    // Auto-post the purchase as an expense (operations → finance).
    await tx.financeTransaction.create({
      data: {
        farmId: user.farmId,
        type: "EXPENSE",
        category: "INITIAL_STOCK",
        description: `Purchase: Poultry Batch ${body.name} (Source: ${body.source})`,
        qty: qty,
        unitPrice: unitPrice,
        amount: total,
        unitLabel: "birds",
        sourceType: "POULTRY",
        sourceRefId: created.id,
        date: new Date(body.date),
      },
    });
    return created;
  });

  return batch;
});

export const GET = withHandler(null, async (_body, user) => {
  return prisma.poultryBatch.findMany({
    where: { farmId: user.farmId },
    orderBy: { deployDate: "desc" },
  });
});
