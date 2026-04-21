/**
 * Dev-only: grant BYPASSRLS to app-facing DB roles so local development
 * works without wiring `SET LOCAL app.current_tenant` into every query.
 *
 * Policies stay intact — they just don't enforce against these roles.
 * Production uses a non-BYPASSRLS role, so RLS remains active there.
 *
 * Run with a superuser connection (postgres), e.g.:
 *   DATABASE_URL="postgresql://postgres:PW@localhost:5432/canop_dev?schema=public" \
 *     pnpm --filter @canop/api exec tsx ../../scripts/dev-bypass-rls.ts
 *
 * Idempotent — safe to re-run.
 */
import { PrismaClient } from "@prisma/client";

const TARGET_ROLES = ["canop", "postgres"];

async function main() {
  const databaseUrl =
    process.env.DATABASE_URL ??
    "postgresql://postgres:vamshi_1708@localhost:5432/canop_dev?schema=public";

  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });

  const me = await prisma.$queryRawUnsafe<
    Array<{ rolname: string; rolsuper: boolean }>
  >("SELECT rolname, rolsuper FROM pg_roles WHERE rolname = current_user;");
  const connectedAs = me[0];
  console.log(
    `[dev-bypass-rls] connected as ${connectedAs?.rolname} (superuser=${connectedAs?.rolsuper})`,
  );

  if (!connectedAs?.rolsuper) {
    console.error(
      "[dev-bypass-rls] must connect as a superuser to grant BYPASSRLS.",
    );
    process.exit(1);
  }

  for (const role of TARGET_ROLES) {
    const rows = await prisma.$queryRawUnsafe<
      Array<{ rolname: string; rolsuper: boolean; rolbypassrls: boolean }>
    >(
      `SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = '${role}';`,
    );
    if (rows.length === 0) {
      console.log(`[dev-bypass-rls] role ${role} not found — skipping`);
      continue;
    }
    const r = rows[0];
    if (r.rolsuper || r.rolbypassrls) {
      console.log(
        `[dev-bypass-rls] role ${role} already bypasses RLS (superuser=${r.rolsuper}, bypassrls=${r.rolbypassrls})`,
      );
      continue;
    }
    console.log(`[dev-bypass-rls] granting BYPASSRLS to ${role}...`);
    await prisma.$executeRawUnsafe(`ALTER ROLE "${role}" BYPASSRLS;`);
    console.log(`[dev-bypass-rls] ✓ ${role} now bypasses RLS`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("[dev-bypass-rls] failed:", err);
  process.exit(1);
});
