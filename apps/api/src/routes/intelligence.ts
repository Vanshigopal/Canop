import { Router } from "express";
import { prisma } from "@/config/db";
import {
  detectAttendanceAnomalies,
  detectLoginDropOff,
  computeEngagementScore,
  snapshotEngagementForTenant,
  computeSubjectStrength,
  getTopPerformers,
  getAtRiskStudents,
  predictPaymentReliability,
  listFeeRisks,
  getQuestionStats,
} from "@/lib/algorithms";
import { Errors } from "@/lib/errors";
import { ok } from "@/lib/response";
import { listReminderOffsets } from "@/services/fee-reminder.service";
import { authenticate, requireRole } from "@/middleware/auth";

export const intelligenceRouter = Router();

intelligenceRouter.use(authenticate, requireRole("ADMIN", "TEACHER"));

intelligenceRouter.get("/engagement", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100));

  const snapshots = await prisma.engagementSnapshot.findMany({
    where: { tenantId },
    orderBy: [{ snapshotDate: "desc" }, { score: "desc" }],
    include: {
      student: {
        include: {
          user: { select: { id: true, name: true } },
          batch: { select: { id: true, name: true } },
        },
      },
    },
    take: limit,
  });

  // Deduplicate per student — keep the latest snapshot
  const byStudent = new Map<string, (typeof snapshots)[number]>();
  for (const s of snapshots) {
    if (!byStudent.has(s.studentId)) byStudent.set(s.studentId, s);
  }

  const rows = Array.from(byStudent.values()).map((s) => ({
    studentId: s.studentId,
    studentName: s.student.user.name,
    batchName: s.student.batch?.name ?? null,
    score: Number(s.score),
    attendanceScore: Number(s.attendanceScore),
    marksScore: Number(s.marksScore),
    assignmentScore: Number(s.assignmentScore),
    videoScore: Number(s.videoScore),
    loginScore: Number(s.loginScore),
    riskFactors: s.riskFactors as string[],
    snapshotDate: s.snapshotDate,
  }));

  return ok(res, rows);
});

intelligenceRouter.get("/engagement/:studentId", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const studentId = req.params.studentId as string;

  const student = await prisma.student.findFirst({
    where: { id: studentId, tenantId, deletedAt: null },
    include: {
      user: { select: { id: true, name: true } },
      batch: { select: { id: true, name: true } },
    },
  });
  if (!student) throw Errors.notFound("Student");

  const breakdown = await computeEngagementScore(tenantId, studentId);
  return ok(res, {
    studentId,
    studentName: student.user.name,
    batchName: student.batch?.name ?? null,
    ...breakdown,
  });
});

intelligenceRouter.get("/engagement/trends/:studentId", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const studentId = req.params.studentId as string;
  const limit = Math.min(90, Math.max(1, Number(req.query.limit) || 30));

  const snapshots = await prisma.engagementSnapshot.findMany({
    where: { tenantId, studentId },
    orderBy: { snapshotDate: "desc" },
    take: limit,
  });
  return ok(
    res,
    snapshots
      .map((s) => ({
        snapshotDate: s.snapshotDate,
        score: Number(s.score),
        attendanceScore: Number(s.attendanceScore),
        marksScore: Number(s.marksScore),
        loginScore: Number(s.loginScore),
        riskFactors: s.riskFactors,
      }))
      .reverse(),
  );
});

intelligenceRouter.post(
  "/engagement/recompute",
  requireRole("ADMIN"),
  async (req, res) => {
    const tenantId = req.user!.tenantId;
    const count = await snapshotEngagementForTenant(tenantId);
    return ok(res, { snapshotted: count });
  },
);

intelligenceRouter.get("/attendance-anomalies", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const results = await detectAttendanceAnomalies(tenantId);
  return ok(res, results);
});

intelligenceRouter.get("/login-dropoff", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const thresholdDays = Math.max(1, Number(req.query.thresholdDays) || 14);
  const results = await detectLoginDropOff(tenantId, thresholdDays);
  return ok(res, results);
});

intelligenceRouter.get("/subject-strength/:studentId", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const studentId = req.params.studentId as string;

  const student = await prisma.student.findFirst({
    where: { id: studentId, tenantId, deletedAt: null },
  });
  if (!student) throw Errors.notFound("Student");

  const rows = await computeSubjectStrength(tenantId, studentId);
  return ok(res, rows);
});

intelligenceRouter.get("/top-performers", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const batchId = req.query.batchId as string | undefined;
  const monthsBack = Math.max(1, Number(req.query.monthsBack) || 1);
  const rows = await getTopPerformers(tenantId, batchId, monthsBack);
  return ok(res, rows);
});

intelligenceRouter.get("/at-risk-students", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const rows = await getAtRiskStudents(tenantId, limit);
  return ok(res, rows);
});

intelligenceRouter.get("/fee-risks", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const rows = await listFeeRisks(tenantId);
  return ok(res, rows);
});

intelligenceRouter.get("/fee-risk/:studentFeeId", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const studentFeeId = req.params.studentFeeId as string;
  const fee = await prisma.studentFee.findFirst({
    where: { id: studentFeeId, tenantId },
  });
  if (!fee) throw Errors.notFound("StudentFee");
  const result = await predictPaymentReliability(tenantId, studentFeeId);
  return ok(res, result);
});

intelligenceRouter.get("/fee-reminder-offsets", requireRole("ADMIN"), async (req, res) => {
  const tenantId = req.user!.tenantId;
  const rows = await listReminderOffsets(tenantId);
  return ok(res, rows);
});

intelligenceRouter.get("/question-stats/:examId", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const examId = req.params.examId as string;
  const result = await getQuestionStats(tenantId, examId);
  return ok(res, result);
});
