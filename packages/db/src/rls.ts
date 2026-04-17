import { PrismaClient } from "@prisma/client";

export async function enableRLS(prisma: PrismaClient): Promise<void> {
  const tenantScopedTables = [
    "users",
    "sessions",
    "audit_logs",
    "permissions",
    "subjects",
    "class_standards",
    "batches",
    "batch_subjects",
    "teacher_subjects",
    "students",
    "guardians",
    "invite_links",
    "join_requests",
    "attendance_sessions",
    "attendance_records",
  ];

  for (const table of tenantScopedTables) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`,
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;`,
    );
    await prisma.$executeRawUnsafe(
      `DROP POLICY IF EXISTS tenant_isolation ON "${table}";`,
    );
    await prisma.$executeRawUnsafe(`
      CREATE POLICY tenant_isolation ON "${table}"
        USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
        WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
    `);
  }

  console.log(`[rls] Enabled RLS on ${tenantScopedTables.length} tables`);
}
