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

statsRouter.get("/overview", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const today = todayUTC();
  const [studentCount, teacherCount, batchCount, pendingJoinRequests, todaySessions] =
    await Promise.all([
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
    ]);

  const overallPresent = todaySessions.reduce((sum, s) => sum + s.totalPresent + s.totalLate, 0);
  const overallTotal = todaySessions.reduce(
    (sum, s) => sum + s.totalPresent + s.totalAbsent + s.totalLate,
    0,
  );
  const percentage = overallTotal > 0 ? Math.round((overallPresent / overallTotal) * 1000) / 10 : 0;

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
    monthRevenue: null,
  });
});
