import { format, startOfDay, subDays, subMonths } from "date-fns";
import { prisma, withTenantTransaction } from "@/config/db";
import { histogram, summary, tTest } from "@/lib/algorithms/statistics";

// ════════════════════════════════════════════════════════
// ATTENDANCE ANALYTICS
// ════════════════════════════════════════════════════════

export async function getAttendanceAnalytics(
  tenantId: string,
  options: {
    dateFrom?: Date;
    dateTo?: Date;
    batchId?: string;
    granularity?: "daily" | "weekly" | "monthly";
  } = {},
) {
  return withTenantTransaction(prisma, tenantId, async (tx) => {
    const dateFrom = options.dateFrom || subDays(new Date(), 30);
    const dateTo = options.dateTo || new Date();
    const batchFilter = options.batchId ? { batchId: options.batchId } : {};

    const sessions = await tx.attendanceSession.findMany({
      where: {
        type: "LECTURE",
        date: { gte: dateFrom, lte: dateTo },
        ...batchFilter,
      },
      include: {
        records: { select: { status: true } },
        batch: { select: { name: true } },
        subject: { select: { name: true } },
      },
      orderBy: { date: "asc" },
    });

    const dayMap = new Map<string, { present: number; total: number }>();
    for (const s of sessions) {
      const key = format(s.date, "yyyy-MM-dd");
      if (!dayMap.has(key)) dayMap.set(key, { present: 0, total: 0 });
      const day = dayMap.get(key);
      if (!day) continue;
      for (const r of s.records) {
        day.total++;
        if (r.status === "PRESENT") day.present++;
      }
    }

    const dailyRates = Array.from(dayMap.entries()).map(([date, { present, total }]) => ({
      date,
      rate: total > 0 ? Math.round((present / total) * 1000) / 10 : 0,
      totalStudents: total,
      present,
    }));

    const allRates = dailyRates.map((d) => d.rate);
    const stats = summary(allRates);

    let batchComparison: Array<{
      batchId: string;
      batchName: string;
      avgRate: number;
      sessionCount: number;
    }> | null = null;
    if (!options.batchId) {
      const batches = await tx.batch.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true },
      });
      const batchRates: Array<{
        batchId: string;
        batchName: string;
        avgRate: number;
        sessionCount: number;
      }> = [];
      for (const batch of batches) {
        const batchSessions = sessions.filter((s) => s.batchId === batch.id);
        if (batchSessions.length === 0) continue;
        const allRecords = batchSessions.flatMap((s) => s.records);
        const presentCount = allRecords.filter((r) => r.status === "PRESENT").length;
        const rate = allRecords.length > 0 ? (presentCount / allRecords.length) * 100 : 0;
        batchRates.push({
          batchId: batch.id,
          batchName: batch.name,
          avgRate: Math.round(rate * 10) / 10,
          sessionCount: batchSessions.length,
        });
      }
      batchComparison = batchRates.sort((a, b) => b.avgRate - a.avgRate);
    }

    const dayOfWeekMap = new Map<number, { present: number; total: number }>();
    for (const s of sessions) {
      const dow = s.date.getDay();
      if (!dayOfWeekMap.has(dow)) dayOfWeekMap.set(dow, { present: 0, total: 0 });
      const d = dayOfWeekMap.get(dow);
      if (!d) continue;
      for (const r of s.records) {
        d.total++;
        if (r.status === "PRESENT") d.present++;
      }
    }
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const heatmap = dayNames.map((name, idx) => {
      const d = dayOfWeekMap.get(idx);
      return {
        day: name,
        rate: d && d.total > 0 ? Math.round((d.present / d.total) * 1000) / 10 : null,
      };
    });

    return {
      dateRange: { from: format(dateFrom, "yyyy-MM-dd"), to: format(dateTo, "yyyy-MM-dd") },
      summary: stats,
      dailyRates,
      batchComparison,
      heatmap,
    };
  });
}

// ════════════════════════════════════════════════════════
// ACADEMIC ANALYTICS
// ════════════════════════════════════════════════════════

export async function getAcademicAnalytics(
  tenantId: string,
  options: { batchId?: string; subjectId?: string; months?: number } = {},
) {
  return withTenantTransaction(prisma, tenantId, async (tx) => {
    const months = options.months || 6;
    const since = subMonths(new Date(), months);

    const exams = await tx.exam.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: { gte: since },
        ...(options.batchId ? { batchId: options.batchId } : {}),
        ...(options.subjectId ? { subjectId: options.subjectId } : {}),
      },
      include: {
        subject: { select: { name: true } },
        batch: { select: { name: true } },
        markEntries: {
          where: { isAbsent: false },
          select: { percentage: true, isPassed: true, grade: true },
        },
      },
      orderBy: { examDate: "asc" },
    });

    const examSummaries = exams.map((e) => {
      const percentages = e.markEntries
        .map((m) => Number(m.percentage || 0))
        .filter((p) => p > 0);
      const stats = summary(percentages);
      const passCount = e.markEntries.filter((m) => m.isPassed).length;
      const totalAppeared = e.markEntries.length;

      return {
        examId: e.id,
        examName: e.name,
        subjectName: e.subject?.name || "Multi-subject",
        batchName: e.batch.name,
        examDate: e.examDate ? format(e.examDate, "yyyy-MM-dd") : null,
        appeared: totalAppeared,
        passRate: totalAppeared > 0 ? Math.round((passCount / totalAppeared) * 1000) / 10 : 0,
        average: stats?.mean ? Math.round(stats.mean * 10) / 10 : 0,
        median: stats?.median || 0,
        highest: stats?.max || 0,
        lowest: stats?.min || 0,
        stdDev: stats?.standardDeviation
          ? Math.round(stats.standardDeviation * 10) / 10
          : 0,
      };
    });

    const passRateEvolution = examSummaries.map((e) => ({
      date: e.examDate,
      examName: e.examName,
      passRate: e.passRate,
      average: e.average,
    }));

    const subjectMap = new Map<string, number[]>();
    for (const e of exams) {
      const subjectName = e.subject?.name || "Multi-subject";
      if (!subjectMap.has(subjectName)) subjectMap.set(subjectName, []);
      const percentages = e.markEntries
        .map((m) => Number(m.percentage || 0))
        .filter((p) => p > 0);
      const arr = subjectMap.get(subjectName);
      if (arr) arr.push(...percentages);
    }
    const subjectComparison = Array.from(subjectMap.entries()).map(([name, values]) => ({
      subject: name,
      average: Math.round((summary(values)?.mean || 0) * 10) / 10,
      examCount: new Set(
        exams.filter((e) => (e.subject?.name || "Multi-subject") === name).map((e) => e.id),
      ).size,
      studentCount: values.length,
    }));

    const allGrades = exams.flatMap((e) =>
      e.markEntries.map((m) => m.grade).filter(Boolean),
    );
    const gradeDistribution = ["A+", "A", "B+", "B", "C", "D", "F"].map((g) => ({
      grade: g,
      count: allGrades.filter((x) => x === g).length,
    }));

    const allPercs = exams.flatMap((e) =>
      e.markEntries.map((m) => Number(m.percentage || 0)).filter((p) => p > 0),
    );

    return {
      examSummaries,
      passRateEvolution,
      subjectComparison,
      gradeDistribution,
      totalExams: exams.length,
      overallAverage: summary(allPercs)?.mean || 0,
    };
  });
}

// ════════════════════════════════════════════════════════
// FINANCIAL ANALYTICS
// ════════════════════════════════════════════════════════

export async function getFinancialAnalytics(
  tenantId: string,
  options: { months?: number } = {},
) {
  return withTenantTransaction(prisma, tenantId, async (tx) => {
    const months = options.months || 6;
    const since = subMonths(new Date(), months);

    const payments = await tx.payment.findMany({
      where: { status: "SUCCESS", paidAt: { gte: since } },
      select: { amount: true, paidAt: true, method: true },
      orderBy: { paidAt: "asc" },
    });

    const monthlyCollection = new Map<string, number>();
    for (const p of payments) {
      if (!p.paidAt) continue;
      const key = format(p.paidAt, "yyyy-MM");
      monthlyCollection.set(key, (monthlyCollection.get(key) || 0) + Number(p.amount));
    }
    const collectionTrend = Array.from(monthlyCollection.entries())
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const overdueInstallments = await tx.installment.findMany({
      where: { status: "OVERDUE" },
      select: { amount: true, dueDate: true },
    });
    const now = new Date();
    const agingBuckets = [
      { label: "1-7 days", min: 1, max: 7, amount: 0, count: 0 },
      { label: "8-14 days", min: 8, max: 14, amount: 0, count: 0 },
      { label: "15-30 days", min: 15, max: 30, amount: 0, count: 0 },
      { label: "31-60 days", min: 31, max: 60, amount: 0, count: 0 },
      { label: "60+ days", min: 61, max: 99999, amount: 0, count: 0 },
    ];
    for (const inst of overdueInstallments) {
      const daysOverdue = Math.floor(
        (now.getTime() - inst.dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      for (const bucket of agingBuckets) {
        if (daysOverdue >= bucket.min && daysOverdue <= bucket.max) {
          bucket.amount += Number(inst.amount);
          bucket.count++;
          break;
        }
      }
    }

    const totalExpected = await tx.installment.aggregate({
      where: { dueDate: { gte: since } },
      _sum: { amount: true },
    });
    const totalCollected = await tx.payment.aggregate({
      where: { status: "SUCCESS", paidAt: { gte: since } },
      _sum: { amount: true },
    });
    const totalOverdue = await tx.installment.aggregate({
      where: { status: "OVERDUE" },
      _sum: { amount: true },
      _count: true,
    });

    const expected = Number(totalExpected._sum.amount || 0);
    const collected = Number(totalCollected._sum.amount || 0);
    const collectionRate = expected > 0 ? Math.round((collected / expected) * 1000) / 10 : 0;

    const methodBreakdown = await tx.payment.groupBy({
      by: ["method"],
      where: { status: "SUCCESS", paidAt: { gte: since } },
      _sum: { amount: true },
      _count: true,
    });

    // Simple revenue forecast — linear projection from last 3 months
    let forecast = 0;
    if (collectionTrend.length >= 3) {
      const last3 = collectionTrend.slice(-3);
      const total = last3.reduce((s, e) => s + Number(e.amount), 0);
      forecast = Math.round(total / 3);
    }

    return {
      summary: {
        expected,
        collected,
        collectionRate,
        overdueAmount: Number(totalOverdue._sum.amount || 0),
        overdueCount: totalOverdue._count,
      },
      collectionTrend,
      agingBuckets,
      methodBreakdown: methodBreakdown.map((m) => ({
        method: m.method || "Unknown",
        amount: Number(m._sum.amount || 0),
        count: m._count,
      })),
      nextMonthForecast: forecast,
    };
  });
}

// ════════════════════════════════════════════════════════
// ENGAGEMENT ANALYTICS
// ════════════════════════════════════════════════════════

export async function getEngagementAnalytics(
  tenantId: string,
  options: { batchId?: string; days?: number } = {},
) {
  return withTenantTransaction(prisma, tenantId, async (tx) => {
    const days = options.days || 30;
    const since = subDays(new Date(), days);

    const latestSnapshots = await tx.engagementSnapshot.findMany({
      where: {
        snapshotDate: { gte: subDays(new Date(), 1) },
      },
      include: {
        student: {
          select: {
            id: true,
            user: { select: { name: true } },
            batchId: true,
            batch: { select: { name: true } },
          },
        },
      },
      orderBy: { score: "desc" },
    });

    const scores = latestSnapshots.map((s) => Number(s.score));
    const scoreStats = summary(scores);
    const scoreDistribution = histogram(scores, 10);

    const riskLevels = {
      excellent: latestSnapshots.filter((s) => Number(s.score) >= 85).length,
      good: latestSnapshots.filter((s) => Number(s.score) >= 70 && Number(s.score) < 85)
        .length,
      neutral: latestSnapshots.filter(
        (s) => Number(s.score) >= 55 && Number(s.score) < 70,
      ).length,
      warning: latestSnapshots.filter(
        (s) => Number(s.score) >= 40 && Number(s.score) < 55,
      ).length,
      critical: latestSnapshots.filter((s) => Number(s.score) < 40).length,
    };

    const dailySnapshots = await tx.engagementSnapshot.groupBy({
      by: ["snapshotDate"],
      where: { snapshotDate: { gte: since } },
      _avg: { score: true },
      _count: true,
      orderBy: { snapshotDate: "asc" },
    });
    const engagementTrend = dailySnapshots.map((d) => ({
      date: format(d.snapshotDate, "yyyy-MM-dd"),
      avgScore: Math.round(Number(d._avg.score || 0) * 10) / 10,
      studentCount: d._count,
    }));

    const videoWatchCount = await tx.videoWatchSession.count({
      where: { startedAt: { gte: since } },
    });
    const materialDownloadCount = await tx.materialAccessLog.count({
      where: { action: "DOWNLOADED", createdAt: { gte: since } },
    });
    const assignmentSubmitCount = await tx.assignmentSubmission.count({
      where: {
        submittedAt: { gte: since },
        status: { in: ["SUBMITTED", "LATE_SUBMITTED", "GRADED"] },
      },
    });

    const topEngaged = latestSnapshots.slice(0, 5).map((s) => ({
      studentId: s.student.id,
      studentName: s.student.user.name,
      batchName: s.student.batch?.name,
      score: Number(s.score),
    }));
    const leastEngaged = [...latestSnapshots]
      .sort((a, b) => Number(a.score) - Number(b.score))
      .slice(0, 5)
      .map((s) => ({
        studentId: s.student.id,
        studentName: s.student.user.name,
        batchName: s.student.batch?.name,
        score: Number(s.score),
        riskFactors: s.riskFactors as string[],
      }));

    return {
      scoreStats,
      scoreDistribution,
      riskLevels,
      engagementTrend,
      contentConsumption: {
        videosWatched: videoWatchCount,
        materialsDownloaded: materialDownloadCount,
        assignmentsSubmitted: assignmentSubmitCount,
      },
      topEngaged,
      leastEngaged,
    };
  });
}

// ════════════════════════════════════════════════════════
// BATCH COMPARISON
// ════════════════════════════════════════════════════════

export async function compareBatches(tenantId: string, batchIdA: string, batchIdB: string) {
  return withTenantTransaction(prisma, tenantId, async (tx) => {
    const [batchA, batchB] = await Promise.all([
      tx.batch.findUnique({
        where: { id: batchIdA },
        select: { id: true, name: true },
      }),
      tx.batch.findUnique({
        where: { id: batchIdB },
        select: { id: true, name: true },
      }),
    ]);
    if (!batchA || !batchB) throw new Error("Batch not found");

    async function batchMetrics(batchId: string) {
      const studentCount = await tx.student.count({
        where: { batchId, deletedAt: null },
      });

      const attendanceRecords = await tx.attendanceRecord.findMany({
        where: {
          session: {
            batchId,
            type: "LECTURE",
            date: { gte: subDays(new Date(), 30) },
          },
        },
        select: { status: true },
      });
      const presentCount = attendanceRecords.filter((r) => r.status === "PRESENT").length;
      const attendanceRate =
        attendanceRecords.length > 0 ? (presentCount / attendanceRecords.length) * 100 : 0;

      const markEntries = await tx.markEntry.findMany({
        where: {
          exam: {
            batchId,
            status: "PUBLISHED",
            publishedAt: { gte: subMonths(new Date(), 6) },
          },
          isAbsent: false,
        },
        select: { percentage: true, isPassed: true },
      });
      const percentages = markEntries
        .map((m) => Number(m.percentage || 0))
        .filter((p) => p > 0);
      const passCount = markEntries.filter((m) => m.isPassed).length;

      const studentIds = (
        await tx.student.findMany({
          where: { batchId },
          select: { id: true },
        })
      ).map((s) => s.id);
      const fees = await tx.installment.aggregate({
        where: { studentFee: { studentId: { in: studentIds } } },
        _sum: { amount: true },
      });
      const collected = await tx.payment.aggregate({
        where: {
          status: "SUCCESS",
          studentFee: { studentId: { in: studentIds } },
        },
        _sum: { amount: true },
      });

      const engagementScores = await tx.engagementSnapshot.findMany({
        where: {
          studentId: { in: studentIds },
          snapshotDate: { gte: subDays(new Date(), 1) },
        },
        select: { score: true },
      });
      const avgEngagement =
        engagementScores.length > 0
          ? engagementScores.reduce((s, e) => s + Number(e.score), 0) /
            engagementScores.length
          : 0;

      const examStats = summary(percentages);

      return {
        studentCount,
        attendanceRate: Math.round(attendanceRate * 10) / 10,
        examAverage: examStats ? Math.round(examStats.mean * 10) / 10 : 0,
        passRate:
          markEntries.length > 0 ? Math.round((passCount / markEntries.length) * 1000) / 10 : 0,
        examPercentages: percentages,
        collectionRate:
          Number(fees._sum.amount || 0) > 0
            ? Math.round(
                (Number(collected._sum.amount || 0) / Number(fees._sum.amount)) * 1000,
              ) / 10
            : 0,
        avgEngagement: Math.round(avgEngagement * 10) / 10,
      };
    }

    const [metricsA, metricsB] = await Promise.all([
      batchMetrics(batchIdA),
      batchMetrics(batchIdB),
    ]);

    const significanceTest = tTest(metricsA.examPercentages, metricsB.examPercentages);

    return {
      batchA: { ...batchA, ...metricsA },
      batchB: { ...batchB, ...metricsB },
      examDiffSignificant: significanceTest.significant,
      examDiffPValue: significanceTest.pValue,
    };
  });
}

// ════════════════════════════════════════════════════════
// HEALTH SCORECARD — 8 KPIs with MoM trends
// ════════════════════════════════════════════════════════

export async function getHealthScorecard(tenantId: string) {
  return withTenantTransaction(prisma, tenantId, async (tx) => {
    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30);
    const sixtyDaysAgo = subDays(now, 60);

    const totalStudents = await tx.student.count({ where: { deletedAt: null } });
    const newThisMonth = await tx.student.count({
      where: { deletedAt: null, enrolledAt: { gte: thirtyDaysAgo } },
    });

    // Attendance (last 30 days vs prior 30 days)
    const attRecent = await tx.attendanceRecord.findMany({
      where: {
        session: { type: "LECTURE", date: { gte: thirtyDaysAgo } },
      },
      select: { status: true },
    });
    const attPrior = await tx.attendanceRecord.findMany({
      where: {
        session: {
          type: "LECTURE",
          date: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
        },
      },
      select: { status: true },
    });
    const attRate = (records: typeof attRecent) =>
      records.length > 0
        ? (records.filter((r) => r.status === "PRESENT").length / records.length) * 100
        : 0;
    const attendancePct = Math.round(attRate(attRecent) * 10) / 10;
    const attendancePctPrior = Math.round(attRate(attPrior) * 10) / 10;

    // Revenue MTD and prior month
    const revenueMTD = await tx.payment.aggregate({
      where: { status: "SUCCESS", paidAt: { gte: thirtyDaysAgo } },
      _sum: { amount: true },
    });
    const revenuePrior = await tx.payment.aggregate({
      where: {
        status: "SUCCESS",
        paidAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
      },
      _sum: { amount: true },
    });

    // Collection rate
    const expected = await tx.installment.aggregate({
      where: { dueDate: { gte: thirtyDaysAgo, lte: now } },
      _sum: { amount: true },
    });
    const collectionRate = Number(expected._sum.amount || 0) > 0
      ? Math.round(
          (Number(revenueMTD._sum.amount || 0) / Number(expected._sum.amount)) * 1000,
        ) / 10
      : 0;

    const expectedPrior = await tx.installment.aggregate({
      where: { dueDate: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
      _sum: { amount: true },
    });
    const collectionRatePrior = Number(expectedPrior._sum.amount || 0) > 0
      ? Math.round(
          (Number(revenuePrior._sum.amount || 0) / Number(expectedPrior._sum.amount)) * 1000,
        ) / 10
      : 0;

    // Engagement current + prior
    const engRecent = await tx.engagementSnapshot.findMany({
      where: { snapshotDate: { gte: subDays(now, 1) } },
      select: { score: true },
    });
    const engPrior = await tx.engagementSnapshot.findMany({
      where: {
        snapshotDate: { gte: subDays(now, 31), lt: subDays(now, 30) },
      },
      select: { score: true },
    });
    const avgEng =
      engRecent.length > 0
        ? engRecent.reduce((s, e) => s + Number(e.score), 0) / engRecent.length
        : 0;
    const avgEngPrior =
      engPrior.length > 0
        ? engPrior.reduce((s, e) => s + Number(e.score), 0) / engPrior.length
        : 0;

    const atRiskCount = engRecent.filter((s) => Number(s.score) < 55).length;
    const atRiskCountPrior = engPrior.filter((s) => Number(s.score) < 55).length;

    // Pass rate + prior
    const marks = await tx.markEntry.findMany({
      where: {
        isAbsent: false,
        exam: { status: "PUBLISHED", publishedAt: { gte: thirtyDaysAgo } },
      },
      select: { isPassed: true },
    });
    const passRate =
      marks.length > 0 ? (marks.filter((m) => m.isPassed).length / marks.length) * 100 : 0;

    const marksPrior = await tx.markEntry.findMany({
      where: {
        isAbsent: false,
        exam: {
          status: "PUBLISHED",
          publishedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
        },
      },
      select: { isPassed: true },
    });
    const passRatePrior =
      marksPrior.length > 0
        ? (marksPrior.filter((m) => m.isPassed).length / marksPrior.length) * 100
        : 0;

    // Pending retests
    const pendingRetests = await tx.retest.count({
      where: { status: { in: ["PENDING_SCHEDULE", "SCHEDULED"] } },
    });

    const delta = (a: number, b: number) => Math.round((a - b) * 10) / 10;

    return {
      studentCount: {
        value: totalStudents,
        delta: newThisMonth,
        label: `+${newThisMonth} MTD`,
      },
      attendancePct: {
        value: attendancePct,
        delta: delta(attendancePct, attendancePctPrior),
        label: `${delta(attendancePct, attendancePctPrior) >= 0 ? "↑" : "↓"}${Math.abs(delta(attendancePct, attendancePctPrior))}% MoM`,
      },
      revenue: {
        value: Number(revenueMTD._sum.amount || 0),
        delta: Number(revenueMTD._sum.amount || 0) - Number(revenuePrior._sum.amount || 0),
        label: "this month",
      },
      collectionRate: {
        value: collectionRate,
        delta: delta(collectionRate, collectionRatePrior),
        label: `${delta(collectionRate, collectionRatePrior) >= 0 ? "↑" : "↓"}${Math.abs(delta(collectionRate, collectionRatePrior))}% MoM`,
      },
      engagement: {
        value: Math.round(avgEng * 10) / 10,
        delta: delta(avgEng, avgEngPrior),
        label: `${delta(avgEng, avgEngPrior) >= 0 ? "↑" : "↓"}${Math.abs(delta(avgEng, avgEngPrior))} pts`,
      },
      atRisk: {
        value: atRiskCount,
        delta: atRiskCount - atRiskCountPrior,
        label:
          atRiskCount - atRiskCountPrior > 0
            ? `↑${atRiskCount - atRiskCountPrior} MoM`
            : `↓${Math.abs(atRiskCount - atRiskCountPrior)} MoM`,
      },
      passRate: {
        value: Math.round(passRate * 10) / 10,
        delta: delta(passRate, passRatePrior),
        label: `${delta(passRate, passRatePrior) >= 0 ? "↑" : "↓"}${Math.abs(delta(passRate, passRatePrior))}% MoM`,
      },
      pendingRetests: {
        value: pendingRetests,
        delta: 0,
        label: "pending",
      },
    };
  });
}

// ════════════════════════════════════════════════════════
// HISTORICAL TRENDS — fetch from AnalyticsSnapshot
// ════════════════════════════════════════════════════════

export async function getHistoricalTrends(
  tenantId: string,
  options: { dateFrom?: Date; dateTo?: Date } = {},
) {
  return withTenantTransaction(prisma, tenantId, async (tx) => {
    const dateFrom = options.dateFrom || subDays(new Date(), 30);
    const dateTo = options.dateTo || new Date();
    const snapshots = await tx.analyticsSnapshot.findMany({
      where: { snapshotDate: { gte: dateFrom, lte: dateTo } },
      orderBy: { snapshotDate: "asc" },
    });
    return snapshots.map((s) => ({
      date: format(s.snapshotDate, "yyyy-MM-dd"),
      avgAttendance: Number(s.avgAttendancePercent),
      passRate: Number(s.passRate),
      collectedRevenue: Number(s.collectedRevenue),
      collectionRate: Number(s.collectionRate),
      avgEngagement: Number(s.avgEngagementScore),
      atRiskCount: s.atRiskCount,
      totalStudents: s.totalStudents,
      videosWatched: s.videosWatched,
      materialsViewed: s.materialsViewed,
    }));
  });
}

// ════════════════════════════════════════════════════════
// DAILY SNAPSHOT COMPUTATION
// ════════════════════════════════════════════════════════

export async function computeDailySnapshot(tenantId: string, date?: Date) {
  const snapshotDate = date || startOfDay(new Date());

  const attendance = await getAttendanceAnalytics(tenantId, {
    dateFrom: subDays(snapshotDate, 1),
    dateTo: snapshotDate,
  });
  const financial = await getFinancialAnalytics(tenantId, { months: 1 });
  const engagement = await getEngagementAnalytics(tenantId, { days: 1 });

  return withTenantTransaction(prisma, tenantId, async (tx) => {
    const totalStudents = await tx.student.count({ where: { deletedAt: null } });
    const pendingRetests = await tx.retest.count({
      where: { status: { in: ["PENDING_SCHEDULE", "SCHEDULED"] } },
    });

    const data = {
      totalSessions: attendance.dailyRates.length,
      avgAttendancePercent: attendance.summary?.mean || 0,
      absentCount: attendance.dailyRates.reduce(
        (s, d) => s + (d.totalStudents - d.present),
        0,
      ),
      expectedRevenue: financial.summary.expected,
      collectedRevenue: financial.summary.collected,
      collectionRate: financial.summary.collectionRate,
      overdueAmount: financial.summary.overdueAmount,
      overdueCount: financial.summary.overdueCount,
      avgEngagementScore: engagement.scoreStats?.mean || 0,
      atRiskCount: engagement.riskLevels.critical + engagement.riskLevels.warning,
      activeStudents: engagement.engagementTrend[0]?.studentCount || 0,
      totalStudents,
      pendingRetests,
      videosWatched: engagement.contentConsumption.videosWatched,
      materialsViewed: engagement.contentConsumption.materialsDownloaded,
      assignmentsSubmitted: engagement.contentConsumption.assignmentsSubmitted,
    };

    return tx.analyticsSnapshot.upsert({
      where: { tenantId_snapshotDate: { tenantId, snapshotDate } },
      update: data,
      create: { tenantId, snapshotDate, ...data },
    });
  });
}
