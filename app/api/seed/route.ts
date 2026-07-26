import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

// One-time demo bootstrap: creates a Farm + OWNER user.
// Protected by a shared SEED_PASSWORD env so it can't be abused publicly in prod.
export async function POST() {
  const seedEmail = (process.env.SEED_EMAIL || "owner@ravia.farm").toLowerCase();
  const seedPassword = process.env.SEED_PASSWORD;
  const farmName = process.env.SEED_FARM_NAME || "Ravia Farms";

  if (!seedPassword) {
    return NextResponse.json(
      { error: "SEED_PASSWORD not configured" },
      { status: 500 },
    );
  }

  const existing = await prisma.user.findFirst({ where: { email: seedEmail } });
  if (existing) {
    return NextResponse.json(
      { message: "Seed already exists", email: seedEmail },
      { status: 200 },
    );
  }

  const farm = await prisma.farm.create({ data: { name: farmName } });
  const passwordHash = await bcrypt.hash(seedPassword, 10);
  const user = await prisma.user.create({
    data: {
      farmId: farm.id,
      email: seedEmail,
      name: "Ravia Owner",
      passwordHash,
      role: "OWNER",
    },
  });

  return NextResponse.json(
    {
      message: "Seeded",
      email: user.email,
      farmId: farm.id,
    },
    { status: 201 },
  );
}
