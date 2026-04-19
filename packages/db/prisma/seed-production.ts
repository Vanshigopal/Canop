import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";
import { enableRLS } from "../src/rls";

const prisma = new PrismaClient();

/**
 * Production seed — creates only the minimum needed for first login.
 *
 * - 1 tenant (owner's institute)
 * - 1 admin user (owner's credentials)
 * - Default notification templates
 * - Default LLM config (DISABLED)
 * - Default subscription (PROFESSIONAL, free for the first tenant)
 * - Platform super admin (Vanshigopal)
 *
 * No demo data. Idempotent via upsert.
 */

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║  Canop — Production Seed                ║");
  console.log("╠══════════════════════════════════════════╣");

  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@canop.app";
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ChangeThisPassword123!";
  const TENANT_NAME = process.env.TENANT_NAME || "My Institute";
  const TENANT_SLUG = (process.env.TENANT_SLUG || "my-institute").toLowerCase();

  const PLATFORM_ADMIN_EMAIL = process.env.PLATFORM_ADMIN_EMAIL || "vansh@canop.app";
  const PLATFORM_ADMIN_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || "PlatformAdmin123!";

  console.log(`Tenant:         ${TENANT_NAME} (${TENANT_SLUG})`);
  console.log(`Tenant admin:   ${ADMIN_EMAIL}`);
  console.log(`Platform admin: ${PLATFORM_ADMIN_EMAIL}`);
  console.log("");

  try {
    await enableRLS(prisma);
    console.log("✓ RLS enabled on all tenant-scoped tables");
  } catch (err) {
    console.warn("⚠ RLS enable failed (ok if already enabled):", (err as Error).message);
  }

  // 1. Tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: TENANT_SLUG },
    update: {},
    create: {
      name: TENANT_NAME,
      slug: TENANT_SLUG,
      status: "ACTIVE",
      tier: "PROFESSIONAL",
      timezone: "Asia/Kolkata",
    },
  });
  console.log(`✓ Tenant created: ${tenant.id}`);

  // 2. Admin user
  const passwordHash = hashSync(ADMIN_PASSWORD, 12);
  const adminUser = await prisma.user.upsert({
    where: {
      tenantId_email: { tenantId: tenant.id, email: ADMIN_EMAIL.toLowerCase() },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      email: ADMIN_EMAIL.toLowerCase(),
      name: "Administrator",
      passwordHash,
      role: "ADMIN",
      isActive: true,
    },
  });
  console.log(`✓ Admin user created: ${adminUser.id}`);

  // 3. Admin permissions
  await prisma.permission.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: adminUser.id } },
    update: {},
    create: {
      tenantId: tenant.id,
      userId: adminUser.id,
      canManageFees: true,
      canApproveAdmissions: true,
      canManageExams: true,
      canManageAttendance: true,
      canManageTimetable: true,
      canSendBroadcasts: true,
      canViewAnalytics: true,
      canManageContent: true,
    },
  });
  console.log("✓ Admin permissions granted");

  // 4. Default notification templates
  const templates = [
    {
      slug: "attendance_absent",
      name: "Absent Notification",
      eventType: "attendance_absent",
      channel: "WHATSAPP" as const,
      body: "Dear {parent_name}, your child {student_name} was marked absent today ({attendance_date}) at {institute_name}. If this is incorrect, please contact the institute.",
    },
    {
      slug: "attendance_absent_sms",
      name: "Absent Notification (SMS)",
      eventType: "attendance_absent",
      channel: "SMS" as const,
      body: "{student_name} was absent on {attendance_date} at {institute_name}. Contact institute if incorrect.",
    },
    {
      slug: "fee_paid",
      name: "Fee Payment Receipt",
      eventType: "fee_paid",
      channel: "WHATSAPP" as const,
      body: "Dear {parent_name}, payment of Rs.{fee_amount} received for {student_name}. Receipt: {receipt_number}. Pending: Rs.{fee_pending}. Thank you! — {institute_name}",
    },
    {
      slug: "fee_reminder",
      name: "Fee Reminder",
      eventType: "fee_reminder",
      channel: "WHATSAPP" as const,
      body: "Dear {parent_name}, installment #{installment_number} of Rs.{fee_amount} for {student_name} is due on {fee_due_date}. Please pay on time. — {institute_name}",
    },
    {
      slug: "fee_overdue",
      name: "Fee Overdue",
      eventType: "fee_overdue",
      channel: "WHATSAPP" as const,
      body: "Dear {parent_name}, installment #{installment_number} of Rs.{fee_amount} for {student_name} is overdue. Due was {fee_due_date}. Total pending: Rs.{fee_pending}. Please pay at the earliest. — {institute_name}",
    },
    {
      slug: "enrollment_approved",
      name: "Enrollment Approved",
      eventType: "enrollment_approved",
      channel: "WHATSAPP" as const,
      body: "Welcome to {institute_name}! Your enrollment has been approved. You can now login using your phone number. Batch: {student_batch}.",
    },
    {
      slug: "marks_published",
      name: "Marks Published",
      eventType: "marks_published",
      channel: "WHATSAPP" as const,
      body: "Dear {parent_name}, {exam_name} results are out. {student_name} scored {marks}/{total_marks} ({percentage}%) in {subject_name}. Rank: {rank}. — {institute_name}",
    },
  ];

  for (const t of templates) {
    await prisma.notificationTemplate.upsert({
      where: {
        tenantId_slug_channel: {
          tenantId: tenant.id,
          slug: t.slug,
          channel: t.channel,
        },
      },
      update: {},
      create: { tenantId: tenant.id, ...t, isDefault: true },
    });
  }
  console.log(`✓ ${templates.length} notification templates created`);

  // 5. LLM config (disabled)
  await prisma.lLMConfig.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: { tenantId: tenant.id, mode: "DISABLED" },
  });
  console.log("✓ LLM config created (DISABLED)");

  // 6. Subscription — PROFESSIONAL free for first tenant
  await prisma.tenantSubscription.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      plan: "PROFESSIONAL",
      status: "ACTIVE",
      maxStudents: 2000,
      maxTeachers: 50,
      maxBatches: 100,
      maxStorageGb: 100,
      aiEnabled: true,
      omrEnabled: true,
      videoEnabled: true,
      analyticsEnabled: true,
      whatsappEnabled: true,
      monthlyPriceInr: 0,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 365 * 86400000),
    },
  });
  console.log("✓ Subscription created (PROFESSIONAL, free)");

  // 7. Platform super admin
  const platformHash = hashSync(PLATFORM_ADMIN_PASSWORD, 12);
  await prisma.platformAdmin.upsert({
    where: { email: PLATFORM_ADMIN_EMAIL.toLowerCase() },
    update: {},
    create: {
      email: PLATFORM_ADMIN_EMAIL.toLowerCase(),
      name: "Vanshigopal Patel",
      passwordHash: platformHash,
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });
  console.log(`✓ Platform super admin created: ${PLATFORM_ADMIN_EMAIL}`);

  console.log("╚══════════════════════════════════════════╝");
  console.log("");
  console.log("Production seed complete. Next steps:");
  console.log(`  Tenant login:      https://${TENANT_SLUG}.canop.app`);
  console.log(`    Email:    ${ADMIN_EMAIL}`);
  console.log(`    Password: ${ADMIN_PASSWORD}`);
  console.log(`  Platform admin:    https://admin.canop.app/platform-admin/login`);
  console.log(`    Email:    ${PLATFORM_ADMIN_EMAIL}`);
  console.log(`    Password: ${PLATFORM_ADMIN_PASSWORD}`);
  console.log("");
  console.log("⚠️  CHANGE BOTH PASSWORDS IMMEDIATELY AFTER FIRST LOGIN");
}

main()
  .catch((err) => {
    console.error("[seed-production] failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
