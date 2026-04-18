import { prisma, withTenantTransaction } from "@/config/db";
import { emitToTenant } from "@/config/socket";
import { Errors } from "@/lib/errors";
import { gradeFromPercent } from "@/lib/grading";
import {
  computeMarks,
  computeRanks,
  computeTrendForStudent,
  evaluatePassFail,
  markEntryResponse,
  pctOf,
} from "@/lib/marks";
import { ok } from "@/lib/response";
import { authenticate, requireRole } from "@/middleware/auth";
import { validate } from "@/middleware/validate";
import { notifySafe } from "@/services/notification.service";
import type { Prisma } from "@prisma/client";
import {
  BulkEnterMarksSchema,
  type BulkEnterMarks,
  EnterMarksSchema,
  type EnterMarks,
} from "@raquel/types";
import { Router } from "express";

export const marksRouter = Router({ mergeParams: true });

marksRouter.use(authenticate, requireRole("ADMIN", "TEACHER", "STAFF"));

async function loadExam(examId: string, tenantId: string) {
  const exam = await prisma.exam.findFirst({
    where: { id: examId, tenantId, deletedAt: null },
  });
  if (!exam) throw Errors.notFound("Exam");
  return exam;
}

async function upsertSingleMark(
  tx: Prisma.TransactionClient,
  args: {
    tenantId: string;
    examId: string;
    userId: string;
    entry: EnterMarks;
    exam: Awaited<ReturnType<typeof loadExam>>;
  },
) {
  const { tenantId, examId, userId, entry, exam } = args;

  const student = await tx.student.findFirst({
    where: { id: entry.studentId, tenantId, deletedAt: null },
  });
  if (!student) throw Errors.notFound("Student");

  const computed = computeMarks(exam, entry);
  if (computed.validationError) {
    throw Errors.badRequest(computed.validationError, "MARKS_VALIDATION_FAILED");
  }

  const totalMarks = Number(exam.totalMarks);
  const pct =
    computed.isAbsent || computed.marksObtained == null
      ? null
      : pctOf(computed.marksObtained, totalMarks);
  const grade = pct == null ? null : gradeFromPercent(pct);
  const isPassed =
    computed.isAbsent || computed.marksObtained == null
      ? null
      : evaluatePassFail(exam, computed.marksObtained, pct ?? 0);

  const existing = await tx.markEntry.findUnique({
    where: { examId_studentId: { examId, studentId: entry.studentId } },
  });

  const data = {
    tenantId,
    examId,
    studentId: entry.studentId,
    marksObtained: computed.marksObtained,
    percentage: pct,
    grade,
    isPassed,
    isAbsent: computed.isAbsent,
    theoryMarks: computed.theoryMarks,
    mcqCorrect: computed.mcqCorrect,
    mcqIncorrect: computed.mcqIncorrect,
    mcqUnattempted: computed.mcqUnattempted,
    mcqPositiveMarks: computed.mcqPositiveMarks,
    mcqNegativeMarks: computed.mcqNegativeMarks,
    mcqNetMarks: computed.mcqNetMarks,
    note: entry.note ?? null,
  };

  if (existing) {
    return tx.markEntry.update({
      where: { id: existing.id },
      data: {
        ...data,
        modifiedById: userId,
        modifiedAt: new Date(),
      },
    });
  }
  return tx.markEntry.create({
    data: {
      ...data,
      enteredById: userId,
      enteredAt: new Date(),
    },
  });
}

async function recalculateExam(
  tx: Prisma.TransactionClient,
  args: { tenantId: string; examId: string },
) {
  const exam = await tx.exam.findFirst({
    where: { id: args.examId, tenantId: args.tenantId, deletedAt: null },
  });
  if (!exam) throw Errors.notFound("Exam");

  const entries = await tx.markEntry.findMany({
    where: { examId: exam.id },
  });

  const totalMarks = Number(exam.totalMarks);

  // Re-derive percentage + grade + pass for each, in case exam config changed
  for (const e of entries) {
    const m = e.marksObtained == null ? null : Number(e.marksObtained);
    if (e.isAbsent || m == null) {
      await tx.markEntry.update({
        where: { id: e.id },
        data: { percentage: null, grade: null, isPassed: null, batchRank: null },
      });
      continue;
    }
    const pct = pctOf(m, totalMarks);
    const grade = gradeFromPercent(pct);
    const passed = evaluatePassFail(exam, m, pct);
    await tx.markEntry.update({
      where: { id: e.id },
      data: { percentage: pct, grade, isPassed: passed },
    });
  }

  // Ranks
  const refreshed = await tx.markEntry.findMany({
    where: { examId: exam.id },
    select: { id: true, marksObtained: true, isAbsent: true, studentId: true, percentage: true },
  });
  const ranks = computeRanks(
    refreshed.map((r) => ({
      id: r.id,
      marksObtained: r.marksObtained == null ? null : Number(r.marksObtained),
      isAbsent: r.isAbsent,
    })),
  );
  for (const r of refreshed) {
    await tx.markEntry.update({
      where: { id: r.id },
      data: { batchRank: ranks.get(r.id) ?? null },
    });
  }

  // Trend direction (C2)
  for (const r of refreshed) {
    if (r.isAbsent || r.percentage == null) {
      await tx.markEntry.update({ where: { id: r.id }, data: { trendDirection: null } });
      continue;
    }
    const trend = await computeTrendForStudent(tx, {
      tenantId: args.tenantId,
      studentId: r.studentId,
      currentExam: exam,
      currentPercentage: Number(r.percentage),
    });
    await tx.markEntry.update({
      where: { id: r.id },
      data: { trendDirection: trend },
    });
  }

  const stats = refreshed.reduce(
    (acc, r) => {
      if (r.isAbsent) acc.absent += 1;
      else acc.updated += 1;
      return acc;
    },
    { updated: 0, absent: 0, passed: 0, failed: 0 },
  );
  const final = await tx.markEntry.findMany({
    where: { examId: exam.id },
    select: { isPassed: true, isAbsent: true },
  });
  for (const f of final) {
    if (f.isAbsent) continue;
    if (f.isPassed) stats.passed += 1;
    else if (f.isPassed === false) stats.failed += 1;
  }
  return stats;
}

// ── List marks ──
marksRouter.get("/", async (req, res) => {
  const examId = (req.params as { id: string }).id;
  const tenantId = req.user!.tenantId;
  const exam = await loadExam(examId, tenantId);

  const students = await prisma.student.findMany({
    where: { tenantId, batchId: exam.batchId, deletedAt: null },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { user: { name: "asc" } },
  });
  const entries = await prisma.markEntry.findMany({
    where: { examId, tenantId },
  });
  const entryMap = new Map(entries.map((e) => [e.studentId, e]));

  const rows = students.map((s) => {
    const e = entryMap.get(s.id);
    return {
      studentId: s.id,
      studentName: s.user.name,
      rollNumber: s.rollNumber,
      entry: e ? markEntryResponse(e) : null,
    };
  });
  return ok(res, {
    exam: {
      id: exam.id,
      name: exam.name,
      type: exam.type,
      status: exam.status,
      totalMarks: Number(exam.totalMarks),
      totalQuestions: exam.totalQuestions,
      marksPerCorrect: exam.marksPerCorrect == null ? null : Number(exam.marksPerCorrect),
      marksPerWrong: exam.marksPerWrong == null ? null : Number(exam.marksPerWrong),
      marksPerUnattempted:
        exam.marksPerUnattempted == null ? null : Number(exam.marksPerUnattempted),
      theoryMaxMarks: exam.theoryMaxMarks == null ? null : Number(exam.theoryMaxMarks),
      mcqMaxMarks: exam.mcqMaxMarks == null ? null : Number(exam.mcqMaxMarks),
      mcqQuestionCount: exam.mcqQuestionCount,
      passingMarks: exam.passingMarks == null ? null : Number(exam.passingMarks),
      passingPercent: exam.passingPercent == null ? null : Number(exam.passingPercent),
      cutOffType: exam.cutOffType,
    },
    rows,
  });
});

// ── Enter / update single ──
marksRouter.post("/", validate(EnterMarksSchema), async (req, res) => {
  const examId = (req.params as { id: string }).id;
  const tenantId = req.user!.tenantId;
  const exam = await loadExam(examId, tenantId);
  if (exam.status === "PUBLISHED" || exam.status === "CANCELLED") {
    throw Errors.badRequest(
      "Marks cannot be entered once exam is published or cancelled",
      "EXAM_LOCKED",
    );
  }
  const body = req.body as EnterMarks;
  const entry = await withTenantTransaction(prisma, tenantId, (tx) =>
    upsertSingleMark(tx, { tenantId, examId, userId: req.user!.id, entry: body, exam }),
  );

  // Auto-move to MARKS_ENTRY if still IN_PROGRESS/SCHEDULED
  if (exam.status === "IN_PROGRESS" || exam.status === "SCHEDULED" || exam.status === "DRAFT") {
    await prisma.exam.update({ where: { id: examId }, data: { status: "MARKS_ENTRY" } });
    emitToTenant(tenantId, "exam:updated", { examId, status: "MARKS_ENTRY" });
  }

  emitToTenant(tenantId, "marks:entered", { examId, studentId: body.studentId });
  return ok(res, markEntryResponse(entry));
});

// ── Bulk entry ──
marksRouter.post("/bulk", validate(BulkEnterMarksSchema), async (req, res) => {
  const examId = (req.params as { id: string }).id;
  const tenantId = req.user!.tenantId;
  const exam = await loadExam(examId, tenantId);
  if (exam.status === "PUBLISHED" || exam.status === "CANCELLED") {
    throw Errors.badRequest("Exam is locked", "EXAM_LOCKED");
  }
  const body = req.body as BulkEnterMarks;

  const out = await withTenantTransaction(prisma, tenantId, async (tx) => {
    const results = [] as Awaited<ReturnType<typeof upsertSingleMark>>[];
    for (const e of body.entries) {
      const r = await upsertSingleMark(tx, {
        tenantId,
        examId,
        userId: req.user!.id,
        entry: e,
        exam,
      });
      results.push(r);
    }
    return results;
  });

  if (exam.status === "IN_PROGRESS" || exam.status === "SCHEDULED" || exam.status === "DRAFT") {
    await prisma.exam.update({ where: { id: examId }, data: { status: "MARKS_ENTRY" } });
    emitToTenant(tenantId, "exam:updated", { examId, status: "MARKS_ENTRY" });
  }

  emitToTenant(tenantId, "marks:entered", { examId, bulk: true, count: out.length });
  return ok(res, { count: out.length, entries: out.map(markEntryResponse) });
});

// ── Update single entry ──
marksRouter.patch(
  "/:entryId",
  validate(EnterMarksSchema.partial().extend({ studentId: EnterMarksSchema.shape.studentId })),
  async (req, res) => {
    const examId = (req.params as { id: string }).id;
    const entryId = req.params.entryId as string;
    const tenantId = req.user!.tenantId;
    const exam = await loadExam(examId, tenantId);
    if (exam.status === "PUBLISHED" || exam.status === "CANCELLED") {
      throw Errors.badRequest("Exam is locked", "EXAM_LOCKED");
    }
    const existing = await prisma.markEntry.findFirst({
      where: { id: entryId, examId, tenantId },
    });
    if (!existing) throw Errors.notFound("Mark entry");
    const body = req.body as EnterMarks;
    const entry = await withTenantTransaction(prisma, tenantId, (tx) =>
      upsertSingleMark(tx, {
        tenantId,
        examId,
        userId: req.user!.id,
        entry: { ...body, studentId: existing.studentId },
        exam,
      }),
    );
    emitToTenant(tenantId, "marks:entered", { examId, studentId: existing.studentId });
    return ok(res, markEntryResponse(entry));
  },
);

// ── Recalculate ──
marksRouter.post("/calculate", async (req, res) => {
  const examId = (req.params as { id: string }).id;
  const tenantId = req.user!.tenantId;
  const exam = await loadExam(examId, tenantId);
  if (exam.status === "CANCELLED") {
    throw Errors.badRequest("Cannot calculate cancelled exam", "EXAM_CANCELLED");
  }
  const stats = await withTenantTransaction(prisma, tenantId, (tx) =>
    recalculateExam(tx, { tenantId, examId }),
  );
  emitToTenant(tenantId, "marks:recalculated", { examId });
  return ok(res, stats);
});

// ── Submit for review ──
marksRouter.post("/submit-for-review", async (req, res) => {
  const examId = (req.params as { id: string }).id;
  const tenantId = req.user!.tenantId;
  const exam = await loadExam(examId, tenantId);
  if (exam.status !== "MARKS_ENTRY") {
    throw Errors.badRequest(
      "Only exams in MARKS_ENTRY can be submitted for review",
      "EXAM_STATUS_INVALID",
    );
  }
  await withTenantTransaction(prisma, tenantId, (tx) => recalculateExam(tx, { tenantId, examId }));
  const updated = await prisma.exam.update({
    where: { id: examId },
    data: { status: "UNDER_REVIEW" },
  });
  emitToTenant(tenantId, "exam:updated", { examId, status: "UNDER_REVIEW" });
  return ok(res, updated);
});

// ── Publish ──
marksRouter.post("/publish", requireRole("ADMIN"), async (req, res) => {
  const examId = (req.params as { id: string }).id;
  const tenantId = req.user!.tenantId;
  const exam = await loadExam(examId, tenantId);
  if (exam.status !== "UNDER_REVIEW" && exam.status !== "MARKS_ENTRY") {
    throw Errors.badRequest(
      "Exam must be in MARKS_ENTRY or UNDER_REVIEW to publish",
      "EXAM_STATUS_INVALID",
    );
  }

  const stats = await withTenantTransaction(prisma, tenantId, (tx) =>
    recalculateExam(tx, { tenantId, examId }),
  );
  const updated = await prisma.exam.update({
    where: { id: examId },
    data: {
      status: "PUBLISHED",
      publishedAt: new Date(),
      publishedById: req.user!.id,
    },
    include: {
      batch: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true } },
    },
  });

  // Send notifications to parents & students (non-absent only)
  const entries = await prisma.markEntry.findMany({
    where: { examId, tenantId, isAbsent: false },
    include: {
      student: {
        include: {
          user: { select: { id: true, name: true } },
          guardians: {
            where: { userId: { not: null } },
            orderBy: { isEmergency: "desc" },
          },
        },
      },
    },
  });
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true },
  });
  const totalMarks = Number(exam.totalMarks);
  const cutOff =
    exam.cutOffType === "MARKS" && exam.passingMarks != null
      ? `${Number(exam.passingMarks)} marks`
      : exam.passingPercent != null
        ? `${Number(exam.passingPercent)}%`
        : "—";

  for (const e of entries) {
    const ctx = {
      student_name: e.student.user.name,
      exam_name: exam.name,
      subject_name: updated.subject?.name ?? "All Subjects",
      marks: String(e.marksObtained == null ? "—" : Number(e.marksObtained)),
      total_marks: String(totalMarks),
      percentage: e.percentage == null ? "—" : String(Number(e.percentage)),
      rank: e.batchRank == null ? "—" : String(e.batchRank),
      cut_off: cutOff,
      institute_name: tenant?.name ?? "",
    };

    // Notify student
    await notifySafe({
      tenantId,
      eventType: "marks_published",
      recipientUserId: e.student.user.id,
      context: { ...ctx, parent_name: e.student.user.name },
    });
    // Notify each guardian who has a linked user account
    for (const g of e.student.guardians) {
      if (!g.userId) continue;
      await notifySafe({
        tenantId,
        eventType: "marks_published",
        recipientUserId: g.userId,
        context: { ...ctx, parent_name: g.name },
      });
    }
  }

  emitToTenant(tenantId, "exam:published", { examId, stats });
  emitToTenant(tenantId, "stats:updated", {});
  return ok(res, { exam: updated, stats });
});
