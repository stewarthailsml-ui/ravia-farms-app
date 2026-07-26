import { prisma } from "@/lib/db";
import { withHandler } from "@/lib/api";
import { VegetableUnitSchema } from "@/lib/schemas";
import { STEMS_PER_UNIT } from "@/lib/constants";

const CROP_MAP: Record<string, any> = {
  "Sukuma Wiki": "SUKUMA_WIKI",
  Spinach: "SPINACH",
  Managu: "MANAGU",
  "Kienyeji Mix": "KIENYEJI_MIX",
};

export const POST = withHandler(VegetableUnitSchema, async (body, user) => {
  const units = Number(body.units);
  const pricePerStem = Number(body.pricePerStem);
  const stems = units * STEMS_PER_UNIT;
  const total = stems * pricePerStem;

  const unit = await prisma.$transaction(async (tx) => {
    const created = await tx.vegetableUnit.create({
      data: {
        farmId: user.farmId,
        cropType: CROP_MAP[body.type],
        source: body.source,
        units: units,
        pricePerStem: pricePerStem,
        stems: stems,
        deployDate: new Date(body.date),
      },
    });
    await tx.financeTransaction.create({
      data: {
        farmId: user.farmId,
        type: "EXPENSE",
        category: "INITIAL_STOCK",
        description: `Purchase: Vegetable Unit ${body.type} (Source: ${body.source})`,
        qty: stems,
        unitPrice: pricePerStem,
        amount: total,
        unitLabel: "stems",
        sourceType: "VEGETABLES",
        sourceRefId: created.id,
        date: new Date(body.date),
      },
    });
    return created;
  });

  return unit;
});

export const GET = withHandler(null, async (_body, user) => {
  return prisma.vegetableUnit.findMany({
    where: { farmId: user.farmId },
    orderBy: { deployDate: "desc" },
  });
});
