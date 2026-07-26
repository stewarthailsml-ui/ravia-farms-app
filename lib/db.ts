import { PrismaClient } from "@prisma/client";

// Singleton — cache on globalThis so Next.js hot-reload / serverless don't exhaust connections.
// DATABASE_URL is read from the environment at connection time (see prisma/schema.prisma).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
