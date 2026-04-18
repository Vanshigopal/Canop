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
    "student_batches",
    "fee_categories",
    "fee_plans",
    "student_fees",
    "installments",
    "payments",
    "notification_templates",
    "broadcast_campaigns",
    "message_deliveries",
    "notification_preferences",
    "consent_records",
    "exams",
    "mark_entries",
    "retests",
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

  // fee_plan_items has no tenant_id column — isolate via parent fee_plan
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "fee_plan_items" ENABLE ROW LEVEL SECURITY;`,
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "fee_plan_items" FORCE ROW LEVEL SECURITY;`,
  );
  await prisma.$executeRawUnsafe(
    `DROP POLICY IF EXISTS tenant_isolation ON "fee_plan_items";`,
  );
  await prisma.$executeRawUnsafe(`
    CREATE POLICY tenant_isolation ON "fee_plan_items"
      USING (
        EXISTS (
          SELECT 1 FROM "fee_plans" fp
          WHERE fp.id = "fee_plan_items".plan_id
            AND fp.tenant_id = current_setting('app.current_tenant', true)::uuid
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM "fee_plans" fp
          WHERE fp.id = "fee_plan_items".plan_id
            AND fp.tenant_id = current_setting('app.current_tenant', true)::uuid
        )
      );
  `);

  console.log(`[rls] Enabled RLS on ${tenantScopedTables.length + 1} tables`);
}
