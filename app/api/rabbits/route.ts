import { prisma } from "@/lib/db";
import { withHandler } from "@/lib/api";
import { RabbitSchema } from "@/lib/schemas";

export const POST = withHandler(RabbitSchema, async (body, user) => {
  const price = Number(body.price);
  const rabbit = await prisma.$transaction(async (tx) => {
    const created = await tx.rabbit.create({
      data: {
        farmId: user.farmId,
        tagId: body.name,
        breed: body.breed,
        sex: body.sex === "Doe (Female)" ? "FEMALE" : "MALE",
        source: body.source,
        price: price,
        acquiredDate: new Date(body.date),
      },
    });
    await tx.financeTransaction.create({
      data: {
        farmId: user.farmId,
        type: "EXPENSE",
        category: "INITIAL_STOCK",
        description: `Purchase: Rabbit ${body.name} (Source: ${body.source})`,
        qty: 1,
        unitPrice: price,
        amount: price,
        unitLabel: "rabbit",
        sourceType: "RABBITRY",
        sourceRefId: created.id,
        date: new Date(body.date),
      },
    });
    return created;
  });
  return rabbit;
});

export const GET = withHandler(null, async (_body, user) => {
  return prisma.rabbit.findMany({
    where: { farmId: user.farmId },
    orderBy: { acquiredDate: "desc" },
  });
});
