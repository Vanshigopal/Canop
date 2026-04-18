import { Router } from "express";
import { prisma } from "@/config/db";
import { ok } from "@/lib/response";
import { authenticate, requireRole } from "@/middleware/auth";

export const statsRouter = Router();

statsRouter.use(authenticate, requireRole("ADMIN", "TEACHER", "STAFF"));

function todayUTC(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function startOfMonthUTC(d: Date = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function startOfPreviousMonthUTC(d: Date = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1));
}

statsRouter.get("/overview", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const today = todayUTC();
  const thisMonthStart = startOfMonthUTC();
  const prevMonthStart = startOfPreviousMonthUTC();

  const recentPublishStart = new Date(today);
  recentPublishStart.setUTCDate(recentPublishStart.getUTCDate() - 30);

  const weekOut = new Date(today);
  weekOut.setUTCDate(weekOut.getUTCDate() + 7);

  const [
    studentCount,
    teacherCount,
    batchCount,
    pendingJoinRequests,
    todaySessions,
    thisMonthPayments,
    prevMonthPayments,
    pendingFeesAgg,
    overdueInstalls,
    upcomingExams,
    recentlyPublishedExams,
    marksEntryPendingExams,
    retestsPendingSchedule,
    retestsScheduledThisWeek,
    retestsCompleted,
    retestsNoShows,
  ] = await Promise.all([
    prisma.student.count({ where: { tenantId, deletedAt: null } }),
    prisma.user.count({ where: { tenantId, role: "TEACHER", deletedAt: null } }),
    prisma.batch.count({ where: { tenantId, deletedAt: null } }),
    prisma.joinRequest.count({ where: { tenantId, status: "PENDING" } }),
    prisma.attendanceSession.findMany({
      where: { tenantId, date: today },
      select: {
        id: true,
        type: true,
        startTime: true,
        endTime: true,
        isFinalized: true,
        totalPresent: true,
        totalAbsent: true,
        totalLate: true,
        batch: { select: { id: true, name: true, _count: { select: { students: true } } } },
        subject: { select: { id: true, name: true } },
      },
      orderBy: [{ startTime: "asc" }],
    }),
    prisma.payment.aggregate({
      where: { tenantId, status: "SUCCESS", paidAt: { gte: thisMonthStart } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: {
        tenantId,
        status: "SUCCESS",
        paidAt: { gte: prevMonthStart, lt: thisMonthStart },
      },
      _sum: { amount: true },
    }),
    prisma.studentFee.aggregate({
      where: { tenantId },
      _sum: { pendingAmount: true },
    }),
    prisma.installment.findMany({
      where: { tenantId, status: "OVERDUE" },
      select: { amount: true, paidAmount: true, lateFee: true },
    }),
    prisma.exam.count({
      where: {
        tenantId,
        deletedAt: null,
        status: { in: ["SCHEDULED", "IN_PROGRESS"] },
        examDate: { gte: today },
      },
    }),
    prisma.exam.count({
      where: {
        tenantId,
        deletedAt: null,
        status: "PUBLISHED",
        publishedAt: { gte: recentPublishStart },
      },
    }),
    prisma.exam.count({
      where: {
        tenantId,
        deletedAt: null,
        status: { in: ["MARKS_ENTRY", "UNDER_REVIEW"] },
      },
    }),
    prisma.retest.count({ where: { tenantId, status: "PENDING_SCHEDULE" } }),
    prisma.retest.count({
      where: {
        tenantId,
        status: "SCHEDULED",
        scheduledDate: { gte: today, lte: weekOut },
      },
    }),
    prisma.retest.count({ where: { tenantId, status: "COMPLETED" } }),
    prisma.retest.count({ where: { tenantId, status: "NO_SHOW" } }),
  ]);

  const overallPresent = todaySessions.reduce((sum, s) => sum + s.totalPresent + s.totalLate, 0);
  const overallTotal = todaySessions.reduce(
    (sum, s) => sum + s.totalPresent + s.totalAbsent + s.totalLate,
    0,
  );
  const percentage = overallTotal > 0 ? Math.round((overallPresent / overallTotal) * 1000) / 10 : 0;

  const thisMonth = Number(thisMonthPayments._sum.amount ?? 0);
  const prevMonth = Number(prevMonthPayments._sum.amount ?? 0);
  const trendPercent =
    prevMonth > 0
      ? Math.round(((thisMonth - prevMonth) / prevMonth) * 1000) / 10
      : thisMonth > 0
        ? 100
        : 0;
  const trend: "up" | "down" | "flat" =
    thisMonth > prevMonth ? "up" : thisMonth < prevMonth ? "down" : "flat";

  const totalOverdue = overdueInstalls.reduce(
    (s, i) => s + (Number(i.amount) - Number(i.paidAmount) + Number(i.lateFee)),
    0,
  );

  return ok(res, {
    studentCount,
    teacherCount,
    batchCount,
    pendingJoinRequests,
    todayAttendance: {
      totalSessions: todaySessions.length,
      overallPresent,
      overallTotal,
      percentage,
      sessions: todaySessions.map((s) => ({
        id: s.id,
        type: s.type,
        startTime: s.startTime,
        endTime: s.endTime,
        isFinalized: s.isFinalized,
        totalPresent: s.totalPresent,
        totalAbsent: s.totalAbsent,
        totalLate: s.totalLate,
        batch: { id: s.batch.id, name: s.batch.name, studentCount: s.batch._count.students },
        subject: s.subject,
      })),
    },
    monthRevenue: {
      collected: Math.round(thisMonth * 100) / 100,
      pending: Math.round(Number(pendingFeesAgg._sum.pendingAmount ?? 0) * 100) / 100,
      overdue: Math.round(totalOverdue * 100) / 100,
      trend,
      trendPercent: Math.abs(trendPercent),
    },
    exams: {
      upcoming: upcomingExams,
      recentlyPublished: recentlyPublishedExams,
      marksEntryPending: marksEntryPendingExams,
    },
    retests: {
      pendingSchedule: retestsPendingSchedule,
      scheduledThisWeek: retestsScheduledThisWeek,
      completed: retestsCompleted,
      noShows: retestsNoShows,
    },
  });
});
