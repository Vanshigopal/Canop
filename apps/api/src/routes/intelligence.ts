import { Router } from "express";
import { prisma, withTenantTransaction } from "@/config/db";
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

/**
 * E3 — Real IRT-style per-question statistics from OMR scan data.
 * Classical test theory: difficulty = 1 - p(correct); discrimination = top27% - bottom27%.
 */
intelligenceRouter.get("/question-stats/:examId", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const examId = req.params.examId as string;

  const exam = await prisma.exam.findFirst({
    where: { id: examId, tenantId, deletedAt: null },
    select: {
      id: true,
      type: true,
      totalQuestions: true,
      status: true,
    },
  });
  if (!exam) throw Errors.notFound("Exam");

  if (exam.type !== "MCQ" && exam.type !== "THEORY_MCQ") {
    return ok(res, {
      available: false,
      reason: "Question-level analysis only available for MCQ exams",
    });
  }

  const scanResults = await withTenantTransaction(prisma, tenantId, (tx) =>
    tx.omrScanResult.findMany({
      where: { examId },
      select: { responses: true },
    }),
  );

  if (scanResults.length < 5) {
    return ok(res, {
      available: false,
      reason: `Need at least 5 OMR-scanned sheets for analysis (currently ${scanResults.length}).`,
      sampleSize: scanResults.length,
    });
  }

  const totalQs = exam.totalQuestions ?? 0;

  type Resp = {
    question_number: number;
    selected_option: number | null;
    is_correct: boolean;
  };

  // Per-question aggregate counts
  const questionStats = new Map<
    number,
    { correct: number; incorrect: number; skipped: number; total: number }
  >();
  for (let i = 1; i <= totalQs; i++) {
    questionStats.set(i, { correct: 0, incorrect: 0, skipped: 0, total: 0 });
  }

  // Per-scan total score (for top/bottom 27% split)
  const scoresPerScan: Array<{ idx: number; score: number }> = [];

  scanResults.forEach((scan, idx) => {
    const responses = (scan.responses as unknown as Resp[]) ?? [];
    let correct = 0;
    for (const r of responses) {
      const stat = questionStats.get(r.question_number);
      if (!stat) continue;
      stat.total += 1;
      if (r.selected_option === null) stat.skipped += 1;
      else if (r.is_correct) {
        stat.correct += 1;
        correct += 1;
      } else stat.incorrect += 1;
    }
    scoresPerScan.push({ idx, score: correct });
  });

  scoresPerScan.sort((a, b) => b.score - a.score);
  const topSize = Math.max(1, Math.floor(scoresPerScan.length * 0.27));
  const topGroup = new Set(scoresPerScan.slice(0, topSize).map((s) => s.idx));
  const bottomGroup = new Set(
    scoresPerScan.slice(-topSize).map((s) => s.idx),
  );

  const questions: Array<{
    questionNumber: number;
    correctCount: number;
    incorrectCount: number;
    skippedCount: number;
    totalResponses: number;
    difficulty: number;
    discrimination: number;
    quality: "excellent" | "good" | "fair" | "poor";
  }> = [];

  for (let qNum = 1; qNum <= totalQs; qNum++) {
    const stat = questionStats.get(qNum)!;
    const difficulty =
      stat.total > 0 ? 1 - stat.correct / stat.total : 0.5;

    let topCorrect = 0;
    let bottomCorrect = 0;
    scanResults.forEach((scan, idx) => {
      const responses = (scan.responses as unknown as Resp[]) ?? [];
      const r = responses.find((x) => x.question_number === qNum);
      if (!r) return;
      if (topGroup.has(idx) && r.is_correct) topCorrect += 1;
      if (bottomGroup.has(idx) && r.is_correct) bottomCorrect += 1;
    });
    const topRate = topCorrect / Math.max(1, topSize);
    const bottomRate = bottomCorrect / Math.max(1, topSize);
    const discrimination = topRate - bottomRate;

    let quality: "excellent" | "good" | "fair" | "poor";
    if (
      discrimination >= 0.4 &&
      difficulty >= 0.2 &&
      difficulty <= 0.8
    )
      quality = "excellent";
    else if (
      discrimination >= 0.2 &&
      difficulty >= 0.15 &&
      difficulty <= 0.85
    )
      quality = "good";
    else if (discrimination >= 0.1) quality = "fair";
    else quality = "poor";

    questions.push({
      questionNumber: qNum,
      correctCount: stat.correct,
      incorrectCount: stat.incorrect,
      skippedCount: stat.skipped,
      totalResponses: stat.total,
      difficulty: Math.round(difficulty * 1000) / 1000,
      discrimination: Math.round(discrimination * 1000) / 1000,
      quality,
    });
  }

  return ok(res, {
    available: true,
    sampleSize: scanResults.length,
    questions,
  });
});
