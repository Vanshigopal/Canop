import { Router } from "express";
import { prisma } from "@/config/db";
import { ok } from "@/lib/response";
import { requirePlatformAuth } from "@/middleware/platform-auth";

export const platformAnalyticsRouter = Router();
platformAnalyticsRouter.use(requirePlatformAuth);

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

platformAnalyticsRouter.get("/overview", async (_req, res) => {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)),
  );

  const [
    tenantCount,
    activeTenants,
    trialTenants,
    suspendedTenants,
    studentCount,
    teacherCount,
    batchCount,
    subscriptions,
    newTenantsThisMonth,
    topByStudents,
    topByRevenue,
  ] = await Promise.all([
    prisma.tenant.count({ where: { deletedAt: null } }),
    prisma.tenant.count({ where: { status: "ACTIVE", deletedAt: null } }),
    prisma.tenant.count({ where: { status: "TRIAL", deletedAt: null } }),
    prisma.tenant.count({ where: { status: "SUSPENDED", deletedAt: null } }),
    prisma.student.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { role: "TEACHER", deletedAt: null } }),
    prisma.batch.count({ where: { deletedAt: null } }),
    prisma.tenantSubscription.findMany({
      select: {
        tenantId: true,
        plan: true,
        monthlyPriceInr: true,
        currentStudentCount: true,
        status: true,
      },
    }),
    prisma.tenant.count({
      where: { createdAt: { gte: monthStart }, deletedAt: null },
    }),
    prisma.tenant.findMany({
      where: { deletedAt: null },
      include: { _count: { select: { students: true } } },
      orderBy: { students: { _count: "desc" } },
      take: 5,
    }),
    prisma.tenantSubscription.findMany({
      orderBy: { totalPaidInr: "desc" },
      take: 5,
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
      },
    }),
  ]);

  const mrr = subscriptions
    .filter((s) => s.status === "ACTIVE")
    .reduce((sum, s) => sum + Number(s.monthlyPriceInr), 0);
  const arr = mrr * 12;

  const newLastMonth = await prisma.tenant.count({
    where: {
      createdAt: { gte: lastMonthStart, lt: monthStart },
      deletedAt: null,
    },
  });

  const revenueThisMonth = await prisma.platformRevenue.aggregate({
    where: { month: monthKey(now) },
    _sum: { totalInr: true },
  });
  const revenueLastMonth = await prisma.platformRevenue.aggregate({
    where: { month: monthKey(lastMonthStart) },
    _sum: { totalInr: true },
  });

  const rThis = Number(revenueThisMonth._sum.totalInr ?? 0);
  const rLast = Number(revenueLastMonth._sum.totalInr ?? 0);
  const revenueTrend = rLast > 0 ? ((rThis - rLast) / rLast) * 100 : 0;

  const avgStudentsPerTenant =
    tenantCount > 0 ? Math.round(studentCount / tenantCount) : 0;

  return ok(res, {
    totalTenants: tenantCount,
    activeTenants,
    trialTenants,
    suspendedTenants,
    totalStudents: studentCount,
    totalTeachers: teacherCount,
    totalBatches: batchCount,
    revenueThisMonth: rThis,
    revenueLastMonth: rLast,
    revenueTrendPct: Math.round(revenueTrend * 10) / 10,
    mrr,
    arr,
    averageStudentsPerTenant: avgStudentsPerTenant,
    churnRate: 0,
    newTenantsThisMonth,
    newTenantsLastMonth: newLastMonth,
    topTenantsByStudents: topByStudents.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      studentCount: t._count.students,
    })),
    topTenantsByRevenue: topByRevenue.map((s) => ({
      id: s.tenant.id,
      name: s.tenant.name,
      slug: s.tenant.slug,
      totalPaidInr: Number(s.totalPaidInr),
      monthlyPriceInr: Number(s.monthlyPriceInr),
      plan: s.plan,
    })),
  });
});

platformAnalyticsRouter.get("/revenue", async (req, res) => {
  const months = Math.min(36, Math.max(1, Number(req.query.months ?? 12)));
  const now = new Date();
  const since = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1),
  );

  const revenues = await prisma.platformRevenue.findMany({
    where: { month: { gte: monthKey(since) } },
    orderBy: { month: "asc" },
  });

  const byMonth = new Map<
    string,
    {
      month: string;
      subscriptionInr: number;
      aiUsageInr: number;
      smsUsageInr: number;
      storageInr: number;
      totalInr: number;
    }
  >();

  // Ensure contiguous months
  for (let i = 0; i < months; i++) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1 - i), 1),
    );
    byMonth.set(monthKey(d), {
      month: monthKey(d),
      subscriptionInr: 0,
      aiUsageInr: 0,
      smsUsageInr: 0,
      storageInr: 0,
      totalInr: 0,
    });
  }

  for (const r of revenues) {
    const entry = byMonth.get(r.month);
    if (!entry) continue;
    entry.subscriptionInr += Number(r.subscriptionInr);
    entry.aiUsageInr += Number(r.aiUsageInr);
    entry.smsUsageInr += Number(r.smsUsageInr);
    entry.storageInr += Number(r.storageInr);
    entry.totalInr += Number(r.totalInr);
  }

  return ok(res, Array.from(byMonth.values()));
});

platformAnalyticsRouter.get("/growth", async (req, res) => {
  const months = Math.min(36, Math.max(1, Number(req.query.months ?? 12)));
  const now = new Date();
  const results: Array<{
    month: string;
    newTenants: number;
    newStudents: number;
    cumulativeTenants: number;
    cumulativeStudents: number;
  }> = [];

  for (let i = months - 1; i >= 0; i--) {
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
    );
    const nextMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 1),
    );

    const [newTenants, newStudents, cumTenants, cumStudents] = await Promise.all([
      prisma.tenant.count({
        where: {
          createdAt: { gte: monthStart, lt: nextMonth },
          deletedAt: null,
        },
      }),
      prisma.student.count({
        where: {
          createdAt: { gte: monthStart, lt: nextMonth },
          deletedAt: null,
        },
      }),
      prisma.tenant.count({
        where: { createdAt: { lt: nextMonth }, deletedAt: null },
      }),
      prisma.student.count({
        where: { createdAt: { lt: nextMonth }, deletedAt: null },
      }),
    ]);

    results.push({
      month: monthKey(monthStart),
      newTenants,
      newStudents,
      cumulativeTenants: cumTenants,
      cumulativeStudents: cumStudents,
    });
  }

  return ok(res, results);
});

platformAnalyticsRouter.get("/usage", async (_req, res) => {
  const [totalMaterials, totalVideos, totalAssignments, storageAgg] = await Promise.all([
    prisma.studyMaterial.count({ where: { deletedAt: null } }),
    prisma.videoLecture.count({ where: { deletedAt: null } }),
    prisma.assignment.count({ where: { deletedAt: null } }),
    prisma.tenantSubscription.aggregate({
      _sum: { currentStorageUsedMb: true },
    }),
  ]);

  const llmTokens = await prisma.lLMRequestLog.aggregate({
    _sum: { totalTokens: true },
    where: {},
  }).catch(() => ({ _sum: { totalTokens: 0 } }));

  return ok(res, {
    totalMaterials,
    totalVideos,
    totalAssignments,
    storageUsedMb: Number(storageAgg._sum.currentStorageUsedMb ?? 0),
    llmTokensTotal: Number(llmTokens._sum.totalTokens ?? 0),
  });
});

// Drill-down: tenant-specific analytics (reuses tenant-scoped services by
// injecting the tenant context via the existing withTenantTransaction).
platformAnalyticsRouter.get("/tenant/:tenantId", async (req, res) => {
  const tenantId = req.params.tenantId as string;

  const [tenant, subscription, studentCount, teacherCount, batchCount, attendanceCount, examCount] =
    await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId } }),
      prisma.tenantSubscription.findUnique({ where: { tenantId } }),
      prisma.student.count({ where: { tenantId, deletedAt: null } }),
      prisma.user.count({ where: { tenantId, role: "TEACHER", deletedAt: null } }),
      prisma.batch.count({ where: { tenantId, deletedAt: null } }),
      prisma.attendanceSession.count({ where: { tenantId } }),
      prisma.exam.count({ where: { tenantId } }),
    ]);

  if (!tenant) return res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Tenant not found" } });

  return ok(res, {
    tenant,
    subscription,
    counts: {
      students: studentCount,
      teachers: teacherCount,
      batches: batchCount,
      attendanceSessions: attendanceCount,
      exams: examCount,
    },
  });
});
