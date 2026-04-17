import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";
import { enableRLS } from "../src/rls";

const prisma = new PrismaClient();

function hashPassword(pw: string): string {
  return hashSync(pw, 12);
}

async function main() {
  console.log("[seed] Starting...");

  // 1. Enable RLS
  await enableRLS(prisma);

  // 2. Create tenants
  const demoTenant = await prisma.tenant.upsert({
    where: { slug: "demo" },
    update: {},
    create: {
      slug: "demo",
      name: "Demo Institute",
      status: "ACTIVE",
      tier: "PROFESSIONAL",
      tagline: "A demonstration institute for exploring Raquel",
      timezone: "Asia/Kolkata",
    },
  });
  console.log(`[seed] Tenant: ${demoTenant.slug} (${demoTenant.id})`);

  const testTenant = await prisma.tenant.upsert({
    where: { slug: "test" },
    update: {},
    create: {
      slug: "test",
      name: "Test Academy",
      status: "ACTIVE",
      tier: "BASIC",
      tagline: "A secondary tenant for isolation testing",
      timezone: "Asia/Kolkata",
    },
  });
  console.log(`[seed] Tenant: ${testTenant.slug} (${testTenant.id})`);

  // 3. Create users
  const demoAdmin = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: demoTenant.id,
        email: "admin@demo.raquel.app",
      },
    },
    update: {},
    create: {
      tenantId: demoTenant.id,
      email: "admin@demo.raquel.app",
      passwordHash: hashPassword("password123"),
      name: "Demo Admin",
      role: "ADMIN",
      phone: "+919876543210",
    },
  });
  console.log("[seed] User: admin@demo.raquel.app / password123");

  await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: testTenant.id,
        email: "admin@test.raquel.app",
      },
    },
    update: {},
    create: {
      tenantId: testTenant.id,
      email: "admin@test.raquel.app",
      passwordHash: hashPassword("password123"),
      name: "Test Admin",
      role: "ADMIN",
    },
  });
  console.log("[seed] User: admin@test.raquel.app / password123");

  const demoTeacher = await prisma.user.upsert({
    where: {
      tenantId_email: { tenantId: demoTenant.id, email: "teacher@demo.raquel.app" },
    },
    update: {},
    create: {
      tenantId: demoTenant.id,
      email: "teacher@demo.raquel.app",
      passwordHash: hashPassword("password123"),
      name: "Demo Teacher",
      role: "TEACHER",
      phone: "+919876543211",
    },
  });
  console.log("[seed] User: teacher@demo.raquel.app (TEACHER)");

  await prisma.user.upsert({
    where: {
      tenantId_email: { tenantId: demoTenant.id, email: "parent@demo.raquel.app" },
    },
    update: {},
    create: {
      tenantId: demoTenant.id,
      email: "parent@demo.raquel.app",
      name: "Demo Parent",
      role: "PARENT",
      phone: "+919876543212",
    },
  });
  console.log("[seed] User: parent@demo.raquel.app (PARENT, phone: +919876543212)");

  await prisma.user.upsert({
    where: {
      tenantId_email: { tenantId: demoTenant.id, email: "student@demo.raquel.app" },
    },
    update: {},
    create: {
      tenantId: demoTenant.id,
      email: "student@demo.raquel.app",
      name: "Demo Student",
      role: "STUDENT",
      phone: "+919876543213",
    },
  });
  console.log("[seed] User: student@demo.raquel.app (STUDENT, phone: +919876543213)");

  // 4. Create permissions
  await prisma.permission.upsert({
    where: { tenantId_userId: { tenantId: demoTenant.id, userId: demoAdmin.id } },
    update: {},
    create: {
      tenantId: demoTenant.id,
      userId: demoAdmin.id,
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
  console.log("[seed] Permission: admin → all flags true");

  await prisma.permission.upsert({
    where: { tenantId_userId: { tenantId: demoTenant.id, userId: demoTeacher.id } },
    update: {},
    create: {
      tenantId: demoTenant.id,
      userId: demoTeacher.id,
      canManageAttendance: true,
      canManageExams: true,
      canManageContent: true,
    },
  });
  console.log("[seed] Permission: teacher → attendance, exams, content");

  console.log("[seed] Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
