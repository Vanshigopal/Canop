import { prisma, withTenantTransaction } from "@/config/db";
import { emitToTenant } from "@/config/socket";
import { Errors } from "@/lib/errors";
import { ok } from "@/lib/response";
import { authenticate, requireRole } from "@/middleware/auth";
import { validate } from "@/middleware/validate";
import { notifySafe } from "@/services/notification.service";
import { Prisma } from "@prisma/client";
import {
  CancelRetestSchema,
  EnterRetestMarksSchema,
  MarkRetestAttendedSchema,
  ScheduleRetestSchema,
  type EnterRetestMarks,
  type ScheduleRetest,
} from "@raquel/types";
import { Router } from "express";

export const retestsRouter = Router();

retestsRouter.use(authenticate, requireRole("ADMIN", "TEACHER", "STAFF"));

function ddmmyyyy(d: Date): string {
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function normalizeDate(str: string): Date {
  return new Date(`${str}T00:00:00.000Z`);
}

async function getRetestOrThrow(id: string, tenantId: string) {
  const retest = await prisma.retest.findFirst({
    where: { id, tenantId },
    include: {
      exam: {
        include: {
          batch: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true } },
        },
      },
      student: {
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          batch: { select: { id: true, name: true } },
          guardians: {
            where: { userId: { not: null } },
            orderBy: { isEmergency: "desc" },
          },
        },
      },
      confirmedBy: { select: { id: true, name: true } },
      enteredBy: { select: { id: true, name: true } },
    },
  });
  if (!retest) throw Errors.notFound("Retest");
  return retest;
}

function decToNum(v: Prisma.Decimal | number | null | undefined): number | null {
  if (v == null) return null;
  return typeof v === "number" ? v : Number(v);
}

function serializeRetest(r: Awaited<ReturnType<typeof getRetestOrThrow>>) {
  return {
    ...r,
    originalMarks: decToNum(r.originalMarks),
    originalPercentage: decToNum(r.originalPercentage),
    cutOff: decToNum(r.cutOff),
    retestMarks: decToNum(r.retestMarks),
    retestPercentage: decToNum(r.retestPercentage),
    retestTheoryMarks: decToNum(r.retestTheoryMarks),
  };
}

// ── List retests ──
retestsRouter.get("/", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { examId, batchId, status, from, to } = req.query as Record<string, string | undefined>;

  const where: Prisma.RetestWhereInput = { tenantId };
  if (examId) where.examId = examId;
  if (status) where.status = status as Prisma.RetestWhereInput["status"];
  if (batchId) where.student = { batchId };
  if (from || to) {
    where.scheduledDate = {};
    if (from) (where.scheduledDate as { gte?: Date }).gte = normalizeDate(from);
    if (to) (where.scheduledDate as { lte?: Date }).lte = normalizeDate(to);
  }

  const rows = await prisma.retest.findMany({
    where,
    include: {
      exam: {
        select: {
          id: true,
          name: true,
          type: true,
          totalMarks: true,
          totalQuestions: true,
          marksPerCorrect: true,
          marksPerWrong: true,
          marksPerUnattempted: true,
          theoryMaxMarks: true,
          mcqMaxMarks: true,
          mcqQuestionCount: true,
          passingMarks: true,
          passingPercent: true,
          cutOffType: true,
          examDate: true,
          subject: { select: { id: true, name: true } },
          batch: { select: { id: true, name: true } },
        },
      },
      student: {
        include: {
          user: { select: { id: true, name: true } },
          batch: { select: { id: true, name: true } },
        },
      },
      confirmedBy: { select: { id: true, name: true } },
    },
    orderBy: [{ scheduledDate: "asc" }, { createdAt: "desc" }],
  });

  return ok(
    res,
    rows.map((r) => ({
      ...r,
      originalMarks: decToNum(r.originalMarks),
      originalPercentage: decToNum(r.originalPercentage),
      cutOff: decToNum(r.cutOff),
      retestMarks: decToNum(r.retestMarks),
      retestPercentage: decToNum(r.retestPercentage),
      retestTheoryMarks: decToNum(r.retestTheoryMarks),
      exam: {
        ...r.exam,
        totalMarks: decToNum(r.exam.totalMarks),
        marksPerCorrect: decToNum(r.exam.marksPerCorrect),
        marksPerWrong: decToNum(r.exam.marksPerWrong),
        marksPerUnattempted: decToNum(r.exam.marksPerUnattempted),
        theoryMaxMarks: decToNum(r.exam.theoryMaxMarks),
        mcqMaxMarks: decToNum(r.exam.mcqMaxMarks),
        passingMarks: decToNum(r.exam.passingMarks),
        passingPercent: decToNum(r.exam.passingPercent),
      },
    })),
  );
});

// ── Upcoming retests (next 7 days) ──
retestsRouter.get("/upcoming", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const weekOut = new Date(today);
  weekOut.setUTCDate(weekOut.getUTCDate() + 7);

  const rows = await prisma.retest.findMany({
    where: {
      tenantId,
      status: "SCHEDULED",
      scheduledDate: { gte: today, lte: weekOut },
    },
    include: {
      exam: { select: { id: true, name: true, subject: { select: { name: true } } } },
      student: { include: { user: { select: { id: true, name: true } } } },
    },
    orderBy: [{ scheduledDate: "asc" }, { scheduledTime: "asc" }],
  });
  return ok(res, rows);
});

// ── Overdue schedules (PENDING_SCHEDULE > 3 days old) ──
retestsRouter.get("/overdue-schedule", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const threshold = new Date();
  threshold.setUTCDate(threshold.getUTCDate() - 3);

  const rows = await prisma.retest.findMany({
    where: { tenantId, status: "PENDING_SCHEDULE", createdAt: { lte: threshold } },
    include: {
      exam: { select: { id: true, name: true, subject: { select: { name: true } } } },
      student: { include: { user: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });
  return ok(res, rows);
});

// ── Get single retest ──
retestsRouter.get("/:id", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const id = req.params.id as string;
  const retest = await getRetestOrThrow(id, tenantId);
  return ok(res, serializeRetest(retest));
});

// ── Schedule ──
retestsRouter.patch("/:id/schedule", validate(ScheduleRetestSchema), async (req, res) => {
  const tenantId = req.user!.tenantId;
  const id = req.params.id as string;
  const body = req.body as ScheduleRetest;

  const existing = await getRetestOrThrow(id, tenantId);
  if (existing.status !== "PENDING_SCHEDULE" && existing.status !== "NO_SHOW") {
    throw Errors.badRequest(
      "Retest must be PENDING_SCHEDULE or NO_SHOW to schedule/reschedule",
      "RETEST_STATUS_INVALID",
    );
  }

  const updated = await withTenantTransaction(prisma, tenantId, (tx) =>
    tx.retest.update({
      where: { id },
      data: {
        scheduledDate: normalizeDate(body.scheduledDate),
        scheduledTime: body.scheduledTime,
        confirmedById: req.user!.id,
        confirmedAt: new Date(),
        status: "SCHEDULED",
        note: body.note ?? existing.note,
        noShowNotifiedAt: null,
      },
    }),
  );

  // Notifications
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true },
  });
  const ctx = {
    student_name: existing.student.user.name,
    exam_name: existing.exam.name,
    subject_name: existing.exam.subject?.name ?? "All Subjects",
    retest_date: ddmmyyyy(normalizeDate(body.scheduledDate)),
    retest_time: body.scheduledTime,
    institute_name: tenant?.name ?? "",
  };

  await notifySafe({
    tenantId,
    eventType: "retest_scheduled",
    recipientUserId: existing.student.user.id,
    context: ctx,
  });
  for (const g of existing.student.guardians) {
    if (!g.userId) continue;
    await notifySafe({
      tenantId,
      eventType: "retest_scheduled_parent",
      recipientUserId: g.userId,
      context: { ...ctx, parent_name: g.name },
    });
  }

  emitToTenant(tenantId, "retest:scheduled", { retestId: id });
  emitToTenant(tenantId, "stats:updated", {});
  return ok(res, updated);
});

// ── Mark attended ──
retestsRouter.post("/:id/mark-attendance", validate(MarkRetestAttendedSchema), async (req, res) => {
  const tenantId = req.user!.tenantId;
  const id = req.params.id as string;
  const body = req.body as { attendedAt?: string };

  const existing = await getRetestOrThrow(id, tenantId);
  if (existing.status !== "SCHEDULED") {
    throw Errors.badRequest("Retest must be SCHEDULED to mark attendance", "RETEST_STATUS_INVALID");
  }
  if (!existing.scheduledDate) {
    throw Errors.badRequest("Retest has no scheduled date", "RETEST_NO_DATE");
  }
  if (!existing.student.batchId) {
    throw Errors.badRequest("Student has no batch assigned", "STUDENT_NO_BATCH");
  }

  const attendedAt = body.attendedAt ? new Date(body.attendedAt) : new Date();
  const batchId = existing.student.batchId;
  const examDate = existing.scheduledDate;

  const result = await withTenantTransaction(prisma, tenantId, async (tx) => {
    // Find or create RETEST AttendanceSession
    let session = await tx.attendanceSession.findFirst({
      where: {
        tenantId,
        batchId,
        type: "RETEST",
        date: examDate,
        examId: existing.examId,
      },
    });
    if (!session) {
      session = await tx.attendanceSession.create({
        data: {
          tenantId,
          batchId,
          subjectId: existing.exam.subjectId ?? null,
          type: "RETEST",
          date: examDate,
          startTime: existing.scheduledTime,
          markedById: req.user!.id,
          examId: existing.examId,
          retestId: existing.id,
          note: `Retest attendance — ${existing.exam.name}`,
        },
      });
    }

    const record = await tx.attendanceRecord.upsert({
      where: {
        sessionId_studentId: { sessionId: session.id, studentId: existing.studentId },
      },
      update: {
        status: "PRESENT",
        method: "MANUAL",
        markedAt: attendedAt,
        markedById: req.user!.id,
        homeBatchId: batchId,
        attendedBatchId: batchId,
        isGuestInBatch: false,
      },
      create: {
        tenantId,
        sessionId: session.id,
        studentId: existing.studentId,
        status: "PRESENT",
        method: "MANUAL",
        markedAt: attendedAt,
        markedById: req.user!.id,
        homeBatchId: batchId,
        attendedBatchId: batchId,
        isGuestInBatch: false,
      },
    });

    const updated = await tx.retest.update({
      where: { id },
      data: {
        attendedAt,
        attendanceRecordId: record.id,
      },
    });
    return updated;
  });

  emitToTenant(tenantId, "retest:attended", { retestId: id });
  return ok(res, result);
});

// ── No-show ──
retestsRouter.post("/:id/no-show", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const id = req.params.id as string;
  const existing = await getRetestOrThrow(id, tenantId);
  if (existing.status !== "SCHEDULED") {
    throw Errors.badRequest(
      "Only SCHEDULED retests can be marked no-show",
      "RETEST_STATUS_INVALID",
    );
  }
  if (!existing.scheduledDate || !existing.student.batchId) {
    throw Errors.badRequest("Retest is missing schedule or batch info", "RETEST_INCOMPLETE");
  }

  const batchId = existing.student.batchId;
  const examDate = existing.scheduledDate;

  const updated = await withTenantTransaction(prisma, tenantId, async (tx) => {
    let session = await tx.attendanceSession.findFirst({
      where: {
        tenantId,
        batchId,
        type: "RETEST",
        date: examDate,
        examId: existing.examId,
      },
    });
    if (!session) {
      session = await tx.attendanceSession.create({
        data: {
          tenantId,
          batchId,
          subjectId: existing.exam.subjectId ?? null,
          type: "RETEST",
          date: examDate,
          startTime: existing.scheduledTime,
          markedById: req.user!.id,
          examId: existing.examId,
          retestId: existing.id,
          note: `Retest attendance — ${existing.exam.name}`,
        },
      });
    }
    await tx.attendanceRecord.upsert({
      where: {
        sessionId_studentId: { sessionId: session.id, studentId: existing.studentId },
      },
      update: {
        status: "ABSENT",
        method: "MANUAL",
        markedAt: new Date(),
        markedById: req.user!.id,
        homeBatchId: batchId,
        attendedBatchId: batchId,
        isGuestInBatch: false,
      },
      create: {
        tenantId,
        sessionId: session.id,
        studentId: existing.studentId,
        status: "ABSENT",
        method: "MANUAL",
        markedById: req.user!.id,
        homeBatchId: batchId,
        attendedBatchId: batchId,
        isGuestInBatch: false,
      },
    });
    return tx.retest.update({
      where: { id },
      data: {
        status: "NO_SHOW",
        noShowNotifiedAt: new Date(),
      },
    });
  });

  // Notify the tutor who scheduled this retest
  if (existing.confirmedById) {
    await notifySafe({
      tenantId,
      eventType: "retest_no_show",
      recipientUserId: existing.confirmedById,
      context: {
        student_name: existing.student.user.name,
        exam_name: existing.exam.name,
        retest_date: ddmmyyyy(examDate),
        retest_time: existing.scheduledTime ?? "",
      },
      channels: ["IN_APP"],
    });
  }

  emitToTenant(tenantId, "retest:no-show", { retestId: id });
  emitToTenant(tenantId, "stats:updated", {});
  return ok(res, updated);
});

// ── Enter marks ──
retestsRouter.post("/:id/enter-marks", validate(EnterRetestMarksSchema), async (req, res) => {
  const tenantId = req.user!.tenantId;
  const id = req.params.id as string;
  const body = req.body as EnterRetestMarks;
  const existing = await getRetestOrThrow(id, tenantId);

  if (existing.status !== "SCHEDULED") {
    throw Errors.badRequest("Retest must be SCHEDULED to enter marks", "RETEST_STATUS_INVALID");
  }
  if (!existing.attendedAt) {
    throw Errors.badRequest(
      "Student must be marked attended before entering marks",
      "RETEST_NOT_ATTENDED",
    );
  }

  const exam = existing.exam;
  const totalMarks = Number(exam.totalMarks);

  let retestMarks = 0;
  let retestTheoryMarks: number | null = null;
  let mcqCorrect: number | null = null;
  let mcqIncorrect: number | null = null;
  let mcqUnattempted: number | null = null;

  if (exam.type === "MCQ") {
    if (
      body.retestMcqCorrect == null ||
      body.retestMcqIncorrect == null ||
      body.retestMcqUnattempted == null
    ) {
      throw Errors.badRequest(
        "MCQ retest requires correct, incorrect, unattempted counts",
        "MARKS_VALIDATION_FAILED",
      );
    }
    const totalQ = exam.totalQuestions ?? 0;
    if (body.retestMcqCorrect + body.retestMcqIncorrect + body.retestMcqUnattempted !== totalQ) {
      throw Errors.badRequest(
        `Correct + Incorrect + Unattempted must equal ${totalQ}`,
        "MARKS_VALIDATION_FAILED",
      );
    }
    const perC = Number(exam.marksPerCorrect ?? 0);
    const perW = Number(exam.marksPerWrong ?? 0);
    const perU = Number(exam.marksPerUnattempted ?? 0);
    retestMarks =
      body.retestMcqCorrect * perC +
      body.retestMcqIncorrect * perW +
      body.retestMcqUnattempted * perU;
    mcqCorrect = body.retestMcqCorrect;
    mcqIncorrect = body.retestMcqIncorrect;
    mcqUnattempted = body.retestMcqUnattempted;
  } else if (exam.type === "THEORY_MCQ") {
    if (
      body.retestTheoryMarks == null ||
      body.retestMcqCorrect == null ||
      body.retestMcqIncorrect == null ||
      body.retestMcqUnattempted == null
    ) {
      throw Errors.badRequest(
        "THEORY_MCQ retest requires theory marks + MCQ counts",
        "MARKS_VALIDATION_FAILED",
      );
    }
    const mcqQ = exam.mcqQuestionCount ?? exam.totalQuestions ?? 0;
    if (body.retestMcqCorrect + body.retestMcqIncorrect + body.retestMcqUnattempted !== mcqQ) {
      throw Errors.badRequest(
        `Correct + Incorrect + Unattempted must equal ${mcqQ}`,
        "MARKS_VALIDATION_FAILED",
      );
    }
    const perC = Number(exam.marksPerCorrect ?? 0);
    const perW = Number(exam.marksPerWrong ?? 0);
    const perU = Number(exam.marksPerUnattempted ?? 0);
    const mcqScore =
      body.retestMcqCorrect * perC +
      body.retestMcqIncorrect * perW +
      body.retestMcqUnattempted * perU;
    retestTheoryMarks = body.retestTheoryMarks;
    retestMarks = body.retestTheoryMarks + mcqScore;
    mcqCorrect = body.retestMcqCorrect;
    mcqIncorrect = body.retestMcqIncorrect;
    mcqUnattempted = body.retestMcqUnattempted;
  } else {
    if (body.retestMarks == null) {
      throw Errors.badRequest(
        "Retest marks required for this exam type",
        "MARKS_VALIDATION_FAILED",
      );
    }
    if (body.retestMarks < 0 || body.retestMarks > totalMarks) {
      throw Errors.badRequest(
        `Marks must be between 0 and ${totalMarks}`,
        "MARKS_VALIDATION_FAILED",
      );
    }
    retestMarks = body.retestMarks;
  }

  const percentage = Math.round((retestMarks / totalMarks) * 10000) / 100;
  const isPassed =
    exam.cutOffType === "MARKS" && exam.passingMarks != null
      ? retestMarks >= Number(exam.passingMarks)
      : exam.cutOffType === "PERCENTAGE" && exam.passingPercent != null
        ? percentage >= Number(exam.passingPercent)
        : true;

  const updated = await withTenantTransaction(prisma, tenantId, (tx) =>
    tx.retest.update({
      where: { id },
      data: {
        retestMarks,
        retestPercentage: percentage,
        retestIsPassed: isPassed,
        retestMcqCorrect: mcqCorrect,
        retestMcqIncorrect: mcqIncorrect,
        retestMcqUnattempted: mcqUnattempted,
        retestTheoryMarks,
        status: "COMPLETED",
        enteredById: req.user!.id,
        note: body.note ?? existing.note,
      },
    }),
  );

  // Notifications (student + parents)
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true },
  });
  const baseCtx = {
    student_name: existing.student.user.name,
    exam_name: exam.name,
    subject_name: exam.subject?.name ?? "All Subjects",
    marks: String(retestMarks),
    total_marks: String(totalMarks),
    percentage: String(percentage),
    institute_name: tenant?.name ?? "",
  };
  await notifySafe({
    tenantId,
    eventType: "retest_results",
    recipientUserId: existing.student.user.id,
    context: { ...baseCtx, parent_name: existing.student.user.name },
  });
  for (const g of existing.student.guardians) {
    if (!g.userId) continue;
    await notifySafe({
      tenantId,
      eventType: "retest_results",
      recipientUserId: g.userId,
      context: { ...baseCtx, parent_name: g.name },
    });
  }

  emitToTenant(tenantId, "retest:completed", {
    retestId: id,
    retestMarks,
    retestIsPassed: isPassed,
  });
  emitToTenant(tenantId, "stats:updated", {});
  return ok(res, updated);
});

// ── Cancel ──
retestsRouter.post("/:id/cancel", validate(CancelRetestSchema), async (req, res) => {
  const tenantId = req.user!.tenantId;
  const id = req.params.id as string;
  const existing = await getRetestOrThrow(id, tenantId);
  if (existing.status === "COMPLETED") {
    throw Errors.badRequest("Completed retests cannot be cancelled", "RETEST_STATUS_INVALID");
  }
  const body = req.body as { note?: string };
  const updated = await withTenantTransaction(prisma, tenantId, (tx) =>
    tx.retest.update({
      where: { id },
      data: { status: "CANCELLED", note: body.note ?? existing.note },
    }),
  );
  emitToTenant(tenantId, "retest:cancelled", { retestId: id });
  emitToTenant(tenantId, "stats:updated", {});
  return ok(res, updated);
});
