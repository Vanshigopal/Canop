import { PrismaClient } from "@prisma/client";

/**
 * Creates a Prisma client that injects tenant context via RLS.
 *
 * Usage:
 *   const db = createPrismaClient();
 *   const tenantDb = db.withTenant(tenantId);
 *   const users = await tenantDb.user.findMany(); // only returns this tenant's users
 */
export function createPrismaClient() {
  const prisma = new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["warn", "error"],
  });

  return prisma.$extends({
    client: {
      /**
       * Returns a new client instance that sets the tenant context
       * on every query via SET LOCAL (transaction-scoped).
       */
      withTenant(tenantId: string) {
        return prisma.$extends({
          query: {
            $allOperations({ args, query }) {
              return prisma.$transaction(async (tx) => {
                await tx.$executeRawUnsafe(
                  `SET LOCAL app.current_tenant = '${tenantId}';`,
                );
                return query(args);
              });
            },
          },
        });
      },
    },
  });
}

export type RaquelDB = ReturnType<typeof createPrismaClient>;
export type TenantDB = ReturnType<RaquelDB["withTenant"]>;

/**
 * Alternative: simpler approach using $transaction directly in route handlers.
 * Use this if the extension approach causes issues.
 *
 * Primary approach for Session 2 route handlers.
 */
export async function withTenantTransaction<T>(
  prisma: PrismaClient,
  tenantId: string,
  fn: (tx: PrismaClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `SET LOCAL app.current_tenant = '${tenantId}';`,
    );
    return fn(tx as unknown as PrismaClient);
  });
}
