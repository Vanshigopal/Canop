import { PrismaClient } from "@prisma/client";
import { withTenantTransaction } from "@raquel/db/client";
import { env } from "./env";

// Singleton Prisma client for the API process
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    datasourceUrl: env.DATABASE_URL,
  });

if (env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Re-export the transaction helper for route handlers
export { withTenantTransaction };
