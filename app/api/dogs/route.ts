import { prisma } from "@/lib/db";
import { withHandler } from "@/lib/api";
import { DogSchema } from "@/lib/schemas";

export const POST = withHandler(DogSchema, async (body, user) => {
  const price = Number(body.price);
  const dog = await prisma.$transaction(async (tx) => {
    const created = await tx.dog.create({
      data: {
        farmId: user.farmId,
        name: body.name,
        breed: body.breed,
        sex: body.sex === "Bitch (Female)" ? "FEMALE" : "MALE",
        source: body.source,
        price: price,
        pedigree: body.pedigree || null,
        acquiredDate: new Date(),
      },
    });
    await tx.financeTransaction.create({
      data: {
        farmId: user.farmId,
        type: "EXPENSE",
        category: "INITIAL_STOCK",
        description: `Purchase: Dog ${body.name} (Source: ${body.source})`,
        qty: 1,
        unitPrice: price,
        amount: price,
        unitLabel: "dog",
        sourceType: "CANINE",
        sourceRefId: created.id,
        date: new Date(),
      },
    });
    return created;
  });
  return dog;
});

export const GET = withHandler(null, async (_body, user) => {
  return prisma.dog.findMany({
    where: { farmId: user.farmId },
    orderBy: { acquiredDate: "desc" },
  });
});
