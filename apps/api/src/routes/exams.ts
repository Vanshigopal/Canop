import { prisma, withTenantTransaction } from "@/config/db";
import { emitToTenant } from "@/config/socket";
import { Errors } from "@/lib/errors";
import { created, ok } from "@/lib/response";
import { trackRecentItem } from "@/lib/search/recency";
import { authenticate, requireRole } from "@/middleware/auth";
import { validate } from "@/middleware/validate";
import { Prisma } from "@prisma/client";
import {
  CreateExamSchema,
  type CreateExam,
  ScheduleExamSchema,
  type ScheduleExam,
  UpdateExamSchema,
  type UpdateExam,
} from "@raquel/types";
import { Router } from "express";

export const examsRouter = Router();

examsRouter.use(authenticate, requireRole("ADMIN", "TEACHER", "STAFF"));

async function getExamOrThrow(id: string, tenantId: string) {
  const exam = await prisma.exam.findFirst({
    where: { id, tenantId, deletedAt: null },
  });
  if (!exam) throw Errors.notFound("Exam");
  return exam;
}

function normalizeDate(str: string): Date {
  return new Date(`${str}T00:00:00.000Z`);
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ── List exams ──
examsRouter.get("/", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { batchId, subjectId, status, from, to } = req.query as Record<string, string | undefined>;

  const where: Prisma.ExamWhereInput = { tenantId, deletedAt: null };
  if (batchId) where.batchId = batchId;
  if (subjectId) where.subjectId = subjectId;
  if (status) where.status = status as Prisma.ExamWhereInput["status"];
  if (from || to) {
    where.examDate = {};
    if (from) (where.examDate as { gte?: Date }).gte = normalizeDate(from);
    if (to) (where.examDate as { lte?: Date }).lte = normalizeDate(to);
  }

  const rows = await prisma.exam.findMany({
    where,
    include: {
      batch: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      _count: { select: { markEntries: true } },
    },
    orderBy: [{ examDate: "desc" }, { createdAt: "desc" }],
  });
  return ok(res, rows);
});

// ── Suggest date (B4 algorithm) — MUST come before /:id routes ──
examsRouter.get("/suggest-date", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { batchId, subjectId } = req.query as Record<string, string | undefined>;
  if (!batchId) throw Errors.badRequest("batchId query param required");

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const thirtyDaysOut = new Date(today);
  thirtyDaysOut.setUTCDate(thirtyDaysOut.getUTCDate() + 30);

  const [conflictingExams, sessionsByDate, subjectExams] = await Promise.all([
    prisma.exam.findMany({
      where: {
        tenantId,
        batchId,
        deletedAt: null,
        status: { in: ["SCHEDULED", "IN_PROGRESS"] },
        examDate: { gte: today, lte: thirtyDaysOut },
      },
      select: { examDate: true, subjectId: true },
    }),
    prisma.attendanceSession.groupBy({
      by: ["date"],
      where: {
        tenantId,
        batchId,
        date: { gte: today, lte: thirtyDaysOut },
      },
      _count: { _all: true },
    }),
    subjectId
      ? prisma.exam.findMany({
          where: {
            tenantId,
            batchId,
            subjectId,
            deletedAt: null,
            examDate: { gte: today, lte: thirtyDaysOut },
          },
          select: { examDate: true },
        })
      : Promise.resolve<Array<{ examDate: Date | null }>>([]),
  ]);

  const examSet = new Set(
    conflictingExams.filter((e) => e.examDate).map((e) => formatDate(e.examDate as Date)),
  );
  const sessionMap = new Map<string, number>();
  for (const row of sessionsByDate) {
    sessionMap.set(formatDate(row.date), row._count._all);
  }

  // B4 — avoid scheduling the same subject within 5 days of another same-subject exam
  const SAME_SUBJECT_MIN_GAP_DAYS = 5;
  const subjectDateKeys = subjectExams
    .filter((e) => e.examDate)
    .map((e) => e.examDate as Date);

  for (let i = 1; i <= 30; i++) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() + i);
    const dow = d.getUTCDay();
    if (dow === 0) continue; // Sunday
    const key = formatDate(d);
    if (examSet.has(key)) continue;
    const sessions = sessionMap.get(key) ?? 0;
    if (sessions > 1) continue;

    // Same-subject clustering check
    const tooCloseToSameSubject = subjectDateKeys.some((existing) => {
      const diffDays = Math.abs((d.getTime() - existing.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays < SAME_SUBJECT_MIN_GAP_DAYS;
    });
    if (tooCloseToSameSubject) continue;

    return ok(res, {
      suggestedDate: key,
      reason:
        sessions === 0
          ? "No conflicts on this date"
          : `Only one existing session on this date — safe to add exam`,
    });
  }

  return ok(res, {
    suggestedDate: null,
    reason: "No conflict-free weekday found in next 30 days",
  });
});

// ── Create exam ──
examsRouter.post("/", validate(CreateExamSchema), async (req, res) => {
  const tenantId = req.user!.tenantId;
  const body = req.body as CreateExam;

  const batch = await prisma.batch.findFirst({
    where: { id: body.batchId, tenantId, deletedAt: null },
  });
  if (!batch) throw Errors.notFound("Batch");

  if (body.subjectId) {
    const subj = await prisma.subject.findFirst({
      where: { id: body.subjectId, tenantId, deletedAt: null },
    });
    if (!subj) throw Errors.notFound("Subject");
  }

  // Store negative marking as negative in DB
  const marksPerWrong =
    body.marksPerWrong == null
      ? null
      : body.marksPerWrong > 0
        ? -body.marksPerWrong
        : body.marksPerWrong;

  const status = body.examDate ? "SCHEDULED" : "DRAFT";

  const exam = await withTenantTransaction(prisma, tenantId, (tx) =>
    tx.exam.create({
      data: {
        tenantId,
        batchId: body.batchId,
        subjectId: body.subjectId ?? null,
        name: body.name,
        description: body.description ?? null,
        type: body.type,
        status,
        totalMarks: body.totalMarks,
        cutOffType: body.cutOffType,
        passingMarks: body.passingMarks ?? null,
        passingPercent: body.passingPercent ?? null,
        totalQuestions: body.totalQuestions ?? null,
        marksPerCorrect: body.marksPerCorrect ?? null,
        marksPerWrong,
        marksPerUnattempted: body.marksPerUnattempted ?? null,
        theoryMaxMarks: body.theoryMaxMarks ?? null,
        mcqMaxMarks: body.mcqMaxMarks ?? null,
        mcqQuestionCount: body.mcqQuestionCount ?? null,
        examDate: body.examDate ? normalizeDate(body.examDate) : null,
        startTime: body.startTime ?? null,
        endTime: body.endTime ?? null,
        duration: body.duration ?? null,
        createdById: req.user!.id,
      },
      include: {
        batch: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
    }),
  );

  emitToTenant(tenantId, "exam:created", { examId: exam.id, status: exam.status });
  emitToTenant(tenantId, "stats:updated", {});
  return created(res, exam);
});

// ── Get single exam ──
examsRouter.get("/:id", async (req, res) => {
  const id = req.params.id as string;
  const tenantId = req.user!.tenantId;
  const exam = await prisma.exam.findFirst({
    where: { id, tenantId, deletedAt: null },
    include: {
      batch: {
        select: { id: true, name: true, _count: { select: { students: true } } },
      },
      subject: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      publishedBy: { select: { id: true, name: true } },
      _count: { select: { markEntries: true } },
    },
  });
  if (!exam) throw Errors.notFound("Exam");
  void trackRecentItem(tenantId, req.user!.id, "exam", id).catch(() => {});
  return ok(res, exam);
});

// ── Update exam ──
examsRouter.patch("/:id", validate(UpdateExamSchema), async (req, res) => {
  const id = req.params.id as string;
  const tenantId = req.user!.tenantId;
  const existing = await getExamOrThrow(id, tenantId);

  if (existing.status === "PUBLISHED") {
    throw Errors.badRequest("Published exams cannot be edited", "EXAM_PUBLISHED");
  }

  const body = req.body as UpdateExam;
  const data: Prisma.ExamUpdateInput = { ...body } as Prisma.ExamUpdateInput;
  if (body.marksPerWrong != null && body.marksPerWrong > 0) {
    data.marksPerWrong = -body.marksPerWrong;
  }
  if (body.examDate !== undefined) {
    data.examDate = body.examDate ? normalizeDate(body.examDate) : null;
  }

  const updated = await withTenantTransaction(prisma, tenantId, (tx) =>
    tx.exam.update({
      where: { id },
      data,
      include: {
        batch: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
    }),
  );
  emitToTenant(tenantId, "exam:updated", { examId: id });
  return ok(res, updated);
});

// ── Delete (soft) — only DRAFT ──
examsRouter.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  const id = req.params.id as string;
  const tenantId = req.user!.tenantId;
  const existing = await getExamOrThrow(id, tenantId);
  if (existing.status !== "DRAFT") {
    throw Errors.badRequest("Only DRAFT exams can be deleted", "EXAM_NOT_DRAFT");
  }
  await withTenantTransaction(prisma, tenantId, (tx) =>
    tx.exam.update({ where: { id }, data: { deletedAt: new Date() } }),
  );
  emitToTenant(tenantId, "exam:deleted", { examId: id });
  return ok(res, { deleted: true });
});

// ── Schedule ──
examsRouter.post("/:id/schedule", validate(ScheduleExamSchema), async (req, res) => {
  const id = req.params.id as string;
  const tenantId = req.user!.tenantId;
  const existing = await getExamOrThrow(id, tenantId);
  const body = req.body as ScheduleExam;
  const updated = await withTenantTransaction(prisma, tenantId, (tx) =>
    tx.exam.update({
      where: { id },
      data: {
        examDate: normalizeDate(body.examDate),
        startTime: body.startTime ?? existing.startTime,
        endTime: body.endTime ?? existing.endTime,
        duration: body.duration ?? existing.duration,
        status: "SCHEDULED",
      },
    }),
  );
  emitToTenant(tenantId, "exam:updated", { examId: id, status: "SCHEDULED" });
  return ok(res, updated);
});

// ── Start / mark in-progress ──
examsRouter.post("/:id/start", async (req, res) => {
  const id = req.params.id as string;
  const tenantId = req.user!.tenantId;
  const existing = await getExamOrThrow(id, tenantId);
  if (existing.status !== "SCHEDULED" && existing.status !== "DRAFT") {
    throw Errors.badRequest(
      "Exam can only be started from SCHEDULED status",
      "EXAM_STATUS_INVALID",
    );
  }
  const updated = await withTenantTransaction(prisma, tenantId, (tx) =>
    tx.exam.update({ where: { id }, data: { status: "IN_PROGRESS" } }),
  );
  emitToTenant(tenantId, "exam:updated", { examId: id, status: "IN_PROGRESS" });
  return ok(res, updated);
});

// ── Complete → MARKS_ENTRY ──
examsRouter.post("/:id/complete", async (req, res) => {
  const id = req.params.id as string;
  const tenantId = req.user!.tenantId;
  const existing = await getExamOrThrow(id, tenantId);
  if (existing.status !== "IN_PROGRESS" && existing.status !== "SCHEDULED") {
    throw Errors.badRequest(
      "Exam must be scheduled or in progress to complete",
      "EXAM_STATUS_INVALID",
    );
  }
  const updated = await withTenantTransaction(prisma, tenantId, (tx) =>
    tx.exam.update({ where: { id }, data: { status: "MARKS_ENTRY" } }),
  );
  emitToTenant(tenantId, "exam:updated", { examId: id, status: "MARKS_ENTRY" });
  return ok(res, updated);
});
