import { prisma } from "@/config/db";
import { Errors } from "@/lib/errors";
import { studentGradebook } from "@/lib/gradebook";
import { distributionBuckets } from "@/lib/grading";
import { markEntryResponse } from "@/lib/marks";
import { ok } from "@/lib/response";
import { authenticate, requireRole } from "@/middleware/auth";
import { Router } from "express";

export const gradebookRouter = Router();

gradebookRouter.use(authenticate, requireRole("ADMIN", "TEACHER", "STAFF"));

// ── Student gradebook (full) ──
gradebookRouter.get("/student/:studentId", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const studentId = req.params.studentId as string;
  const gb = await studentGradebook(prisma, { tenantId, studentId });
  if (!gb) throw Errors.notFound("Student");
  return ok(res, gb);
});

// ── Student gradebook summary only ──
gradebookRouter.get("/student/:studentId/summary", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const studentId = req.params.studentId as string;

  const student = await prisma.student.findFirst({
    where: { id: studentId, tenantId, deletedAt: null },
  });
  if (!student) throw Errors.notFound("Student");

  const entries = await prisma.markEntry.findMany({
    where: {
      tenantId,
      studentId,
      exam: { status: "PUBLISHED", deletedAt: null },
      isAbsent: false,
      percentage: { not: null },
    },
    include: {
      exam: { include: { subject: { select: { name: true } } } },
    },
    orderBy: [{ exam: { examDate: "desc" } }],
  });
  const avg =
    entries.length > 0
      ? entries.reduce((s, e) => s + (e.percentage ? Number(e.percentage) : 0), 0) / entries.length
      : 0;
  const subjects = new Map<string, { total: number; count: number }>();
  for (const e of entries) {
    const name = e.exam.subject?.name ?? "All Subjects";
    const cur = subjects.get(name) ?? { total: 0, count: 0 };
    cur.total += e.percentage ? Number(e.percentage) : 0;
    cur.count += 1;
    subjects.set(name, cur);
  }
  const subjectArr = Array.from(subjects.entries()).map(([name, v]) => ({
    name,
    average: Math.round((v.total / Math.max(v.count, 1)) * 100) / 100,
  }));
  const best = subjectArr.sort((a, b) => b.average - a.average)[0] ?? null;
  return ok(res, {
    examsTaken: entries.length,
    overallAverage: Math.round(avg * 100) / 100,
    bestSubject: best,
  });
});

// ── Exam results (all students) ──
gradebookRouter.get("/exam/:examId", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const examId = req.params.examId as string;
  const exam = await prisma.exam.findFirst({
    where: { id: examId, tenantId, deletedAt: null },
    include: {
      batch: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true } },
    },
  });
  if (!exam) throw Errors.notFound("Exam");
  const entries = await prisma.markEntry.findMany({
    where: { examId, tenantId },
    include: {
      student: { include: { user: { select: { id: true, name: true } } } },
    },
    orderBy: [{ batchRank: "asc" }, { marksObtained: "desc" }],
  });
  return ok(res, {
    exam: {
      id: exam.id,
      name: exam.name,
      type: exam.type,
      status: exam.status,
      totalMarks: Number(exam.totalMarks),
      examDate: exam.examDate,
      subject: exam.subject,
      batch: exam.batch,
    },
    entries: entries.map((e) => ({
      ...markEntryResponse(e),
      studentName: e.student.user.name,
      studentId: e.student.id,
      rollNumber: e.student.rollNumber,
    })),
  });
});

// ── Exam analysis ──
gradebookRouter.get("/exam/:examId/analysis", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const examId = req.params.examId as string;
  const exam = await prisma.exam.findFirst({
    where: { id: examId, tenantId, deletedAt: null },
    include: { batch: { select: { id: true, name: true } } },
  });
  if (!exam) throw Errors.notFound("Exam");
  const entries = await prisma.markEntry.findMany({
    where: { examId, tenantId },
    include: { student: { include: { user: { select: { name: true } } } } },
  });
  const totalStudents = await prisma.student.count({
    where: { tenantId, batchId: exam.batchId, deletedAt: null },
  });

  const present = entries.filter((e) => !e.isAbsent && e.marksObtained != null);
  const absent = entries.filter((e) => e.isAbsent).length;
  const passed = present.filter((e) => e.isPassed === true).length;
  const failed = present.filter((e) => e.isPassed === false).length;

  const marksList = present
    .map((e) => (e.marksObtained ? Number(e.marksObtained) : 0))
    .sort((a, b) => a - b);
  const avg = marksList.length > 0 ? marksList.reduce((s, m) => s + m, 0) / marksList.length : 0;
  const median =
    marksList.length === 0
      ? 0
      : marksList.length % 2
        ? (marksList[Math.floor(marksList.length / 2)] ?? 0)
        : ((marksList[marksList.length / 2 - 1] ?? 0) + (marksList[marksList.length / 2] ?? 0)) / 2;
  const std =
    marksList.length > 0
      ? Math.sqrt(marksList.reduce((s, m) => s + (m - avg) ** 2, 0) / marksList.length)
      : 0;
  const highest = present.reduce(
    (best, e) =>
      e.marksObtained != null && Number(e.marksObtained) > (best?.marks ?? -Infinity)
        ? { marks: Number(e.marksObtained), studentName: e.student.user.name }
        : best,
    null as { marks: number; studentName: string } | null,
  );
  const lowest = present.reduce(
    (worst, e) =>
      e.marksObtained != null && Number(e.marksObtained) < (worst?.marks ?? Infinity)
        ? { marks: Number(e.marksObtained), studentName: e.student.user.name }
        : worst,
    null as { marks: number; studentName: string } | null,
  );

  const totalMarks = Number(exam.totalMarks);
  const buckets = distributionBuckets(totalMarks);
  const distribution = buckets.map((b) => ({
    range: b.label,
    count: present.filter((e) => {
      const m = Number(e.marksObtained ?? 0);
      return m >= b.from && m <= b.to;
    }).length,
  }));

  const rankings = present
    .slice()
    .sort((a, b) => (a.batchRank ?? 9999) - (b.batchRank ?? 9999))
    .map((e) => ({
      rank: e.batchRank,
      studentId: e.studentId,
      studentName: e.student.user.name,
      marks: Number(e.marksObtained ?? 0),
      percentage: e.percentage == null ? null : Number(e.percentage),
    }));

  return ok(res, {
    exam: {
      id: exam.id,
      name: exam.name,
      type: exam.type,
      status: exam.status,
      totalMarks,
      batch: exam.batch,
    },
    stats: {
      totalStudents,
      appeared: present.length,
      absent,
      passed,
      failed,
      passRate: present.length > 0 ? Math.round((passed / present.length) * 1000) / 10 : 0,
      average: Math.round(avg * 100) / 100,
      median: Math.round(median * 100) / 100,
      highest,
      lowest,
      standardDeviation: Math.round(std * 100) / 100,
    },
    distribution,
    rankings,
  });
});

// ── Batch-level report ──
gradebookRouter.get("/batch/:batchId/report", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const batchId = req.params.batchId as string;
  const batch = await prisma.batch.findFirst({
    where: { id: batchId, tenantId, deletedAt: null },
    include: { class: true },
  });
  if (!batch) throw Errors.notFound("Batch");
  const exams = await prisma.exam.findMany({
    where: { tenantId, batchId, status: "PUBLISHED", deletedAt: null },
    include: {
      subject: { select: { id: true, name: true } },
      markEntries: {
        where: { isAbsent: false },
        select: { marksObtained: true, isPassed: true },
      },
    },
    orderBy: [{ examDate: "desc" }],
  });
  const rows = exams.map((e) => {
    const marks = e.markEntries
      .map((m) => (m.marksObtained ? Number(m.marksObtained) : null))
      .filter((n): n is number => n != null);
    const avg = marks.length > 0 ? marks.reduce((s, m) => s + m, 0) / marks.length : 0;
    const passed = e.markEntries.filter((m) => m.isPassed).length;
    const total = e.markEntries.length;
    return {
      examId: e.id,
      examName: e.name,
      examType: e.type,
      subject: e.subject,
      examDate: e.examDate,
      average: Math.round(avg * 100) / 100,
      totalMarks: Number(e.totalMarks),
      passRate: total > 0 ? Math.round((passed / total) * 1000) / 10 : 0,
      appeared: total,
    };
  });
  return ok(res, { batch: { id: batch.id, name: batch.name }, exams: rows });
});
