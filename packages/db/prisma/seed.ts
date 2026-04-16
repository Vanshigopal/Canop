import { hash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { enableRLS } from "../src/rls";

const prisma = new PrismaClient();

/**
 * Simple password hashing for dev seeds.
 * Session 3 replaces this with bcrypt/argon2.
 */
function hashPassword(pw: string): string {
  return hash("sha256", pw, "hex");
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

  // 3. Create admin users (one per tenant)
  // RLS is enabled but we're the DB owner, so we can write directly
  await prisma.user.upsert({
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

  // 4. Create a few additional users in demo tenant for testing
  const roles: Array<{
    email: string;
    name: string;
    role: "TEACHER" | "PARENT" | "STUDENT";
  }> = [
    {
      email: "teacher@demo.raquel.app",
      name: "Demo Teacher",
      role: "TEACHER",
    },
    { email: "parent@demo.raquel.app", name: "Demo Parent", role: "PARENT" },
    {
      email: "student@demo.raquel.app",
      name: "Demo Student",
      role: "STUDENT",
    },
  ];

  for (const u of roles) {
    await prisma.user.upsert({
      where: {
        tenantId_email: { tenantId: demoTenant.id, email: u.email },
      },
      update: {},
      create: {
        tenantId: demoTenant.id,
        email: u.email,
        passwordHash: hashPassword("password123"),
        name: u.name,
        role: u.role,
      },
    });
    console.log(`[seed] User: ${u.email} (${u.role})`);
  }

  console.log("[seed] Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
