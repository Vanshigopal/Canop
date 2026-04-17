import { Router } from "express";
import { prisma } from "@/config/db";
import { ok } from "@/lib/response";
import { authenticate, requireRole } from "@/middleware/auth";

export const statsRouter = Router();

statsRouter.use(authenticate, requireRole("ADMIN", "TEACHER", "STAFF"));

statsRouter.get("/overview", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const [studentCount, teacherCount, batchCount, pendingJoinRequests] = await Promise.all([
    prisma.student.count({ where: { tenantId, deletedAt: null } }),
    prisma.user.count({ where: { tenantId, role: "TEACHER", deletedAt: null } }),
    prisma.batch.count({ where: { tenantId, deletedAt: null } }),
    prisma.joinRequest.count({ where: { tenantId, status: "PENDING" } }),
  ]);
  return ok(res, {
    studentCount,
    teacherCount,
    batchCount,
    pendingJoinRequests,
    todayAttendanceRate: null,
    monthRevenue: null,
  });
});
