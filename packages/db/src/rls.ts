import { PrismaClient } from "@prisma/client";

/**
 * Enable Row-Level Security on all tenant-scoped tables.
 *
 * Pattern: each table gets a policy that checks
 *   tenant_id = current_setting('app.current_tenant')::uuid
 *
 * The application sets this via:
 *   SET LOCAL app.current_tenant = '<uuid>';
 * at the start of each transaction.
 *
 * The Tenant table itself does NOT get RLS (it's a global lookup table).
 */
export async function enableRLS(prisma: PrismaClient): Promise<void> {
  const tenantScopedTables = ["users", "sessions", "audit_logs", "permissions"];

  for (const table of tenantScopedTables) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`,
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;`,
    );

    // Drop existing policy if any (idempotent)
    await prisma.$executeRawUnsafe(
      `DROP POLICY IF EXISTS tenant_isolation ON "${table}";`,
    );

    // Create isolation policy
    await prisma.$executeRawUnsafe(`
      CREATE POLICY tenant_isolation ON "${table}"
        USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
        WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
    `);
  }

  console.log(`[rls] Enabled RLS on ${tenantScopedTables.length} tables`);
}
