import { randomBytes } from "node:crypto";
import { prisma, withTenantTransaction } from "@/config/db";
import { Errors } from "@/lib/errors";
import { created, ok, paginated } from "@/lib/response";
import { authenticate, requireRole } from "@/middleware/auth";
import { validate } from "@/middleware/validate";
import { Prisma } from "@prisma/client";
import {
  AddGuestStudentSchema,
  type AttendanceStatus,
  BulkMarkAttendanceSchema,
  CreateAttendanceSessionSchema,
  MarkAllAttendanceSchema,
  MarkAttendanceSchema,
  QrVerifySchema,
  UpdateAttendanceRecordSchema,
  UpdateAttendanceSessionSchema,
} from "@raquel/types";
import { Router } from "express";

export const attendanceRouter = Router();

// ── Helpers ──────────────────────────────────────────────

async function getSessionOrThrow(id: string, tenantId: string) {
  const session = await prisma.attendanceSession.findFirst({
    where: { id, tenantId },
    include: { batch: { select: { id: true, name: true } } },
  });
  if (!session) throw Errors.notFound("Attendance session");
  return session;
}

function ensureEditable(session: { isFinalized: boolean }) {
  if (session.isFinalized) {
    throw Errors.badRequest("Session is finalized — no further edits allowed", "SESSION_FINALIZED");
  }
}

async function recomputeTotals(tx: Prisma.TransactionClient, sessionId: string) {
  const counts = await tx.attendanceRecord.groupBy({
    by: ["status"],
    where: { sessionId },
    _count: { _all: true },
  });
  const totals: Record<AttendanceStatus, number> = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 };
  for (const c of counts) {
    totals[c.status] = c._count._all;
  }
  await tx.attendanceSession.update({
    where: { id: sessionId },
    data: {
      totalPresent: totals.PRESENT,
      totalAbsent: totals.ABSENT,
      totalLate: totals.LATE,
    },
  });
}

function clientDeviceInfo(req: {
  headers: Record<string, unknown>;
  ip?: string;
  socket?: { remoteAddress?: string };
}) {
  const ua = (req.headers["user-agent"] as string | undefined)?.slice(0, 500) ?? null;
  const ip = ((req.ip ?? req.socket?.remoteAddress ?? "") as string).slice(0, 45) || null;
  return { deviceInfo: ua, ipAddress: ip };
}

// ════════════════════════════════════════════════════════
// ATTENDANCE SESSIONS (ADMIN/TEACHER)
// ════════════════════════════════════════════════════════

const adminOrTeacher = [authenticate, requireRole("ADMIN", "TEACHER", "STAFF")];

attendanceRouter.post(
  "/sessions",
  ...adminOrTeacher,
  validate(CreateAttendanceSessionSchema),
  async (req, res) => {
    const tenantId = req.user!.tenantId;
    const body = req.body as import("@raquel/types").CreateAttendanceSession;

    const batch = await prisma.batch.findFirst({
      where: { id: body.batchId, tenantId, deletedAt: null },
    });
    if (!batch) throw Errors.notFound("Batch");

    try {
      const session = await withTenantTransaction(prisma, tenantId, (tx) =>
        tx.attendanceSession.create({
          data: {
            tenantId,
            batchId: body.batchId,
            subjectId: body.subjectId ?? null,
            type: body.type,
            date: new Date(`${body.date}T00:00:00.000Z`),
            startTime: body.startTime ?? null,
            endTime: body.endTime ?? null,
            markedById: req.user!.id,
            note: body.note ?? null,
            examId: body.examId ?? null,
            retestId: body.retestId ?? null,
          },
          include: {
            batch: { select: { id: true, name: true } },
            subject: { select: { id: true, name: true } },
            records: true,
          },
        }),
      );
      return created(res, session);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw Errors.badRequest(
          "A session already exists for this batch, type, date, and start time",
          "SESSION_DUPLICATE",
        );
      }
      throw err;
    }
  },
);

attendanceRouter.get("/sessions", ...adminOrTeacher, async (req, res) => {
  const { batchId, date, type, from, to } = req.query as Record<string, string | undefined>;
  const where: Prisma.AttendanceSessionWhereInput = { tenantId: req.user!.tenantId };
  if (batchId) where.batchId = batchId;
  if (type) where.type = type as "LECTURE" | "EXAM" | "RETEST";
  if (date) where.date = new Date(`${date}T00:00:00.000Z`);
  if (from || to) {
    where.date = {};
    if (from) (where.date as { gte?: Date }).gte = new Date(`${from}T00:00:00.000Z`);
    if (to) (where.date as { lte?: Date }).lte = new Date(`${to}T00:00:00.000Z`);
  }

  const sessions = await prisma.attendanceSession.findMany({
    where,
    include: {
      batch: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true } },
      markedBy: { select: { id: true, name: true } },
      _count: { select: { records: true } },
    },
    orderBy: [{ date: "desc" }, { startTime: "asc" }],
  });
  return ok(res, sessions);
});

attendanceRouter.get("/sessions/:id", ...adminOrTeacher, async (req, res) => {
  const id = req.params.id as string;
  const session = await prisma.attendanceSession.findFirst({
    where: { id, tenantId: req.user!.tenantId },
    include: {
      batch: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true } },
      markedBy: { select: { id: true, name: true } },
      records: {
        include: {
          student: {
            include: {
              user: { select: { id: true, name: true } },
              batch: { select: { id: true, name: true } },
            },
          },
          markedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!session) throw Errors.notFound("Attendance session");
  return ok(res, session);
});

attendanceRouter.patch(
  "/sessions/:id",
  ...adminOrTeacher,
  validate(UpdateAttendanceSessionSchema),
  async (req, res) => {
    const id = req.params.id as string;
    const tenantId = req.user!.tenantId;
    const existing = await getSessionOrThrow(id, tenantId);
    ensureEditable(existing);

    const updated = await withTenantTransaction(prisma, tenantId, (tx) =>
      tx.attendanceSession.update({
        where: { id },
        data: req.body,
        include: {
          batch: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true } },
        },
      }),
    );
    return ok(res, updated);
  },
);

attendanceRouter.post("/sessions/:id/finalize", ...adminOrTeacher, async (req, res) => {
  const id = req.params.id as string;
  const tenantId = req.user!.tenantId;
  const existing = await getSessionOrThrow(id, tenantId);
  if (existing.isFinalized) {
    return ok(res, existing);
  }

  const updated = await withTenantTransaction(prisma, tenantId, (tx) =>
    tx.attendanceSession.update({
      where: { id },
      data: { isFinalized: true, qrCode: null, qrExpiresAt: null },
    }),
  );
  return ok(res, updated);
});

// ════════════════════════════════════════════════════════
// MARKING ENDPOINTS
// ════════════════════════════════════════════════════════

async function upsertRecord(
  tx: Prisma.TransactionClient,
  args: {
    tenantId: string;
    sessionId: string;
    studentId: string;
    sessionBatchId: string;
    status: AttendanceStatus;
    method: "QR_SCAN" | "MANUAL" | "BULK";
    note?: string | null;
    lateMinutes?: number | null;
    markedById?: string | null;
    deviceInfo?: string | null;
    ipAddress?: string | null;
  },
) {
  const student = await tx.student.findFirst({
    where: { id: args.studentId, tenantId: args.tenantId, deletedAt: null },
    include: { batch: { select: { id: true, name: true } } },
  });
  if (!student) throw Errors.notFound("Student");

  const homeBatchId = student.batchId ?? args.sessionBatchId;
  const isGuest = homeBatchId !== args.sessionBatchId;
  let autoNote = args.note ?? null;
  if (isGuest && !autoNote) {
    const home = await tx.batch.findUnique({
      where: { id: homeBatchId },
      select: { name: true },
    });
    autoNote = `Guest from ${home?.name ?? "another batch"}`;
  }

  return tx.attendanceRecord.upsert({
    where: { sessionId_studentId: { sessionId: args.sessionId, studentId: args.studentId } },
    update: {
      status: args.status,
      method: args.method,
      note: autoNote,
      lateMinutes: args.lateMinutes ?? null,
      markedAt: new Date(),
      markedById: args.markedById ?? null,
      deviceInfo: args.deviceInfo ?? null,
      ipAddress: args.ipAddress ?? null,
      homeBatchId,
      attendedBatchId: args.sessionBatchId,
      isGuestInBatch: isGuest,
    },
    create: {
      tenantId: args.tenantId,
      sessionId: args.sessionId,
      studentId: args.studentId,
      status: args.status,
      method: args.method,
      note: autoNote,
      lateMinutes: args.lateMinutes ?? null,
      markedById: args.markedById ?? null,
      deviceInfo: args.deviceInfo ?? null,
      ipAddress: args.ipAddress ?? null,
      homeBatchId,
      attendedBatchId: args.sessionBatchId,
      isGuestInBatch: isGuest,
    },
  });
}

attendanceRouter.post(
  "/sessions/:id/mark",
  ...adminOrTeacher,
  validate(MarkAttendanceSchema),
  async (req, res) => {
    const id = req.params.id as string;
    const tenantId = req.user!.tenantId;
    const session = await getSessionOrThrow(id, tenantId);
    ensureEditable(session);

    const body = req.body as import("@raquel/types").MarkAttendance;
    const { deviceInfo, ipAddress } = clientDeviceInfo(req);

    const record = await withTenantTransaction(prisma, tenantId, async (tx) => {
      const r = await upsertRecord(tx, {
        tenantId,
        sessionId: session.id,
        studentId: body.studentId,
        sessionBatchId: session.batchId,
        status: body.status,
        method: body.method,
        note: body.note,
        lateMinutes: body.lateMinutes,
        markedById: req.user!.id,
        deviceInfo,
        ipAddress,
      });
      await recomputeTotals(tx, session.id);
      return r;
    });
    return ok(res, record);
  },
);

attendanceRouter.post(
  "/sessions/:id/mark-bulk",
  ...adminOrTeacher,
  validate(BulkMarkAttendanceSchema),
  async (req, res) => {
    const id = req.params.id as string;
    const tenantId = req.user!.tenantId;
    const session = await getSessionOrThrow(id, tenantId);
    ensureEditable(session);

    const body = req.body as import("@raquel/types").BulkMarkAttendance;
    const { deviceInfo, ipAddress } = clientDeviceInfo(req);

    const records = await withTenantTransaction(prisma, tenantId, async (tx) => {
      const out = [] as Awaited<ReturnType<typeof upsertRecord>>[];
      for (const r of body.records) {
        const result = await upsertRecord(tx, {
          tenantId,
          sessionId: session.id,
          studentId: r.studentId,
          sessionBatchId: session.batchId,
          status: r.status,
          method: body.method,
          note: r.note,
          lateMinutes: r.lateMinutes,
          markedById: req.user!.id,
          deviceInfo,
          ipAddress,
        });
        out.push(result);
      }
      await recomputeTotals(tx, session.id);
      return out;
    });
    return ok(res, records);
  },
);

attendanceRouter.post(
  "/sessions/:id/mark-all",
  ...adminOrTeacher,
  validate(MarkAllAttendanceSchema),
  async (req, res) => {
    const id = req.params.id as string;
    const tenantId = req.user!.tenantId;
    const session = await getSessionOrThrow(id, tenantId);
    ensureEditable(session);
    const body = req.body as import("@raquel/types").MarkAllAttendance;

    const students = await prisma.student.findMany({
      where: { tenantId, batchId: session.batchId, deletedAt: null },
      select: { id: true },
    });
    const { deviceInfo, ipAddress } = clientDeviceInfo(req);

    const records = await withTenantTransaction(prisma, tenantId, async (tx) => {
      const out = [] as Awaited<ReturnType<typeof upsertRecord>>[];
      for (const s of students) {
        const r = await upsertRecord(tx, {
          tenantId,
          sessionId: session.id,
          studentId: s.id,
          sessionBatchId: session.batchId,
          status: body.status,
          method: body.method,
          markedById: req.user!.id,
          deviceInfo,
          ipAddress,
        });
        out.push(r);
      }
      await recomputeTotals(tx, session.id);
      return out;
    });

    const full = await prisma.attendanceRecord.findMany({
      where: { sessionId: session.id },
      include: {
        student: {
          include: {
            user: { select: { id: true, name: true } },
            batch: { select: { id: true, name: true } },
          },
        },
      },
    });
    return ok(res, { marked: records.length, records: full });
  },
);

attendanceRouter.post(
  "/sessions/:id/add-guest",
  ...adminOrTeacher,
  validate(AddGuestStudentSchema),
  async (req, res) => {
    const id = req.params.id as string;
    const tenantId = req.user!.tenantId;
    const session = await getSessionOrThrow(id, tenantId);
    ensureEditable(session);

    const body = req.body as import("@raquel/types").AddGuestStudent;

    const student = await prisma.student.findFirst({
      where: { id: body.studentId, tenantId, deletedAt: null },
      include: { batch: { select: { id: true, name: true } }, user: { select: { name: true } } },
    });
    if (!student) throw Errors.notFound("Student");
    if (student.batchId === session.batchId) {
      throw Errors.badRequest(
        "Student is already in this batch — use regular marking instead",
        "NOT_GUEST",
      );
    }

    const { deviceInfo, ipAddress } = clientDeviceInfo(req);

    const record = await withTenantTransaction(prisma, tenantId, async (tx) => {
      const homeName = student.batch?.name ?? "another batch";
      const sessionBatchName = session.batch.name;
      const combinedNote = body.note
        ? `Guest from ${homeName} — ${body.note}`
        : `Guest from ${homeName}`;

      const r = await tx.attendanceRecord.upsert({
        where: {
          sessionId_studentId: { sessionId: session.id, studentId: student.id },
        },
        update: {
          status: body.status,
          method: "MANUAL",
          note: combinedNote,
          markedAt: new Date(),
          markedById: req.user!.id,
          deviceInfo,
          ipAddress,
          homeBatchId: student.batchId ?? session.batchId,
          attendedBatchId: session.batchId,
          isGuestInBatch: true,
        },
        create: {
          tenantId,
          sessionId: session.id,
          studentId: student.id,
          status: body.status,
          method: "MANUAL",
          note: combinedNote,
          markedById: req.user!.id,
          deviceInfo,
          ipAddress,
          homeBatchId: student.batchId ?? session.batchId,
          attendedBatchId: session.batchId,
          isGuestInBatch: true,
        },
      });

      // Mirror record in the student's home-batch session if one exists for same date/type
      if (student.batchId) {
        const homeSession = await tx.attendanceSession.findFirst({
          where: {
            tenantId,
            batchId: student.batchId,
            type: session.type,
            date: session.date,
          },
        });
        if (homeSession) {
          await tx.attendanceRecord.upsert({
            where: {
              sessionId_studentId: {
                sessionId: homeSession.id,
                studentId: student.id,
              },
            },
            update: {
              status: "PRESENT",
              method: "MANUAL",
              note: `Attended in ${sessionBatchName}`,
              attendedBatchId: session.batchId,
              isGuestInBatch: true,
              markedAt: new Date(),
              markedById: req.user!.id,
            },
            create: {
              tenantId,
              sessionId: homeSession.id,
              studentId: student.id,
              status: "PRESENT",
              method: "MANUAL",
              note: `Attended in ${sessionBatchName}`,
              homeBatchId: student.batchId,
              attendedBatchId: session.batchId,
              isGuestInBatch: true,
              markedById: req.user!.id,
              deviceInfo,
              ipAddress,
            },
          });
          await recomputeTotals(tx, homeSession.id);
        }
      }

      await recomputeTotals(tx, session.id);
      return r;
    });

    const full = await prisma.attendanceRecord.findUnique({
      where: { id: record.id },
      include: {
        student: {
          include: {
            user: { select: { id: true, name: true } },
            batch: { select: { id: true, name: true } },
          },
        },
      },
    });
    return created(res, full);
  },
);

attendanceRouter.patch(
  "/records/:recordId",
  ...adminOrTeacher,
  validate(UpdateAttendanceRecordSchema),
  async (req, res) => {
    const recordId = req.params.recordId as string;
    const tenantId = req.user!.tenantId;
    const record = await prisma.attendanceRecord.findFirst({
      where: { id: recordId, tenantId },
      include: { session: true },
    });
    if (!record) throw Errors.notFound("Attendance record");
    ensureEditable(record.session);

    const updated = await withTenantTransaction(prisma, tenantId, async (tx) => {
      const r = await tx.attendanceRecord.update({
        where: { id: recordId },
        data: {
          ...req.body,
          markedAt: new Date(),
          markedById: req.user!.id,
        },
      });
      await recomputeTotals(tx, record.sessionId);
      return r;
    });
    return ok(res, updated);
  },
);

// ════════════════════════════════════════════════════════
// QR ATTENDANCE
// ════════════════════════════════════════════════════════

attendanceRouter.post("/sessions/:id/generate-qr", ...adminOrTeacher, async (req, res) => {
  const id = req.params.id as string;
  const tenantId = req.user!.tenantId;
  const session = await getSessionOrThrow(id, tenantId);
  ensureEditable(session);

  const qrCode = randomBytes(32).toString("hex");
  const qrExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

  const updated = await withTenantTransaction(prisma, tenantId, (tx) =>
    tx.attendanceSession.update({
      where: { id },
      data: { qrCode, qrExpiresAt },
      select: { id: true, qrCode: true, qrExpiresAt: true, batchId: true },
    }),
  );
  return ok(res, {
    sessionId: updated.id,
    qrCode: updated.qrCode,
    expiresAt: updated.qrExpiresAt,
  });
});

attendanceRouter.get("/qr/:code/status", async (req, res) => {
  const code = req.params.code as string;
  const session = await prisma.attendanceSession.findUnique({
    where: { qrCode: code },
    include: {
      batch: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true } },
    },
  });
  if (!session || !session.qrExpiresAt) {
    return ok(res, { valid: false, reason: "QR_NOT_FOUND" });
  }
  if (session.isFinalized) {
    return ok(res, { valid: false, reason: "SESSION_FINALIZED" });
  }
  if (session.qrExpiresAt.getTime() < Date.now()) {
    return ok(res, { valid: false, reason: "QR_EXPIRED" });
  }
  return ok(res, {
    valid: true,
    sessionId: session.id,
    batch: session.batch,
    subject: session.subject,
    date: session.date,
    startTime: session.startTime,
    endTime: session.endTime,
    type: session.type,
    expiresAt: session.qrExpiresAt,
  });
});

attendanceRouter.post(
  "/qr/verify",
  authenticate,
  requireRole("STUDENT"),
  validate(QrVerifySchema),
  async (req, res) => {
    const tenantId = req.user!.tenantId;
    const { qrCode } = req.body as import("@raquel/types").QrVerify;

    const session = await prisma.attendanceSession.findUnique({
      where: { qrCode },
      include: {
        batch: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
    });
    if (!session || session.tenantId !== tenantId) {
      throw Errors.badRequest("Invalid QR code", "QR_INVALID");
    }
    if (session.isFinalized) {
      throw Errors.badRequest("This session has been finalized", "SESSION_FINALIZED");
    }
    if (!session.qrExpiresAt || session.qrExpiresAt.getTime() < Date.now()) {
      throw Errors.badRequest(
        "QR code expired — please ask tutor to generate a new one",
        "QR_EXPIRED",
      );
    }

    const student = await prisma.student.findFirst({
      where: { userId: req.user!.id, tenantId, deletedAt: null },
    });
    if (!student) throw Errors.badRequest("Student profile not found", "NOT_STUDENT");

    const { deviceInfo, ipAddress } = clientDeviceInfo(req);

    const record = await withTenantTransaction(prisma, tenantId, async (tx) => {
      const r = await upsertRecord(tx, {
        tenantId,
        sessionId: session.id,
        studentId: student.id,
        sessionBatchId: session.batchId,
        status: "PRESENT",
        method: "QR_SCAN",
        markedById: null,
        deviceInfo,
        ipAddress,
      });
      await recomputeTotals(tx, session.id);
      return r;
    });

    return ok(res, {
      success: true,
      status: record.status,
      isGuest: record.isGuestInBatch,
      session: {
        id: session.id,
        batch: session.batch,
        subject: session.subject,
        date: session.date,
        startTime: session.startTime,
        endTime: session.endTime,
        type: session.type,
      },
    });
  },
);

// ════════════════════════════════════════════════════════
// REPORTS & HISTORY
// ════════════════════════════════════════════════════════

attendanceRouter.get("/daily", ...adminOrTeacher, async (req, res) => {
  const { date } = req.query as Record<string, string | undefined>;
  const tenantId = req.user!.tenantId;
  const day = date ? new Date(`${date}T00:00:00.000Z`) : todayUTC();

  const sessions = await prisma.attendanceSession.findMany({
    where: { tenantId, date: day },
    include: {
      batch: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true } },
      _count: { select: { records: true } },
    },
    orderBy: [{ startTime: "asc" }],
  });

  const students = await prisma.student.count({ where: { tenantId, deletedAt: null } });
  const totalPresent = sessions.reduce((sum, s) => sum + s.totalPresent, 0);
  const totalRecords = sessions.reduce(
    (sum, s) => sum + s.totalPresent + s.totalAbsent + s.totalLate,
    0,
  );

  return ok(res, {
    date: day,
    studentCount: students,
    sessions,
    totals: {
      sessionCount: sessions.length,
      present: totalPresent,
      records: totalRecords,
      percentage: totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 1000) / 10 : 0,
    },
  });
});

attendanceRouter.get("/batch/:batchId/summary", ...adminOrTeacher, async (req, res) => {
  const batchId = req.params.batchId as string;
  const tenantId = req.user!.tenantId;
  const { from, to } = req.query as Record<string, string | undefined>;

  const where: Prisma.AttendanceSessionWhereInput = { tenantId, batchId };
  if (from || to) {
    where.date = {};
    if (from) (where.date as { gte?: Date }).gte = new Date(`${from}T00:00:00.000Z`);
    if (to) (where.date as { lte?: Date }).lte = new Date(`${to}T00:00:00.000Z`);
  }

  const sessions = await prisma.attendanceSession.findMany({
    where,
    select: {
      id: true,
      date: true,
      type: true,
      totalPresent: true,
      totalAbsent: true,
      totalLate: true,
    },
    orderBy: [{ date: "desc" }],
  });

  const totals = sessions.reduce(
    (acc, s) => {
      acc.present += s.totalPresent;
      acc.absent += s.totalAbsent;
      acc.late += s.totalLate;
      return acc;
    },
    { present: 0, absent: 0, late: 0 },
  );
  const total = totals.present + totals.absent + totals.late;

  return ok(res, {
    batchId,
    sessions,
    totals: {
      ...totals,
      total,
      percentage: total > 0 ? Math.round((totals.present / total) * 1000) / 10 : 0,
    },
  });
});

attendanceRouter.get("/student/:studentId/history", ...adminOrTeacher, async (req, res) => {
  const studentId = req.params.studentId as string;
  const tenantId = req.user!.tenantId;
  const {
    type,
    from,
    to,
    page = "1",
    limit = "50",
  } = req.query as Record<string, string | undefined>;
  const p = Math.max(1, Number(page));
  const ps = Math.min(200, Math.max(1, Number(limit ?? "50")));

  const student = await prisma.student.findFirst({
    where: { id: studentId, tenantId, deletedAt: null },
  });
  if (!student) throw Errors.notFound("Student");

  const where: Prisma.AttendanceRecordWhereInput = { tenantId, studentId };
  if (type || from || to) {
    const sessionFilter: Prisma.AttendanceSessionWhereInput = {};
    if (type) sessionFilter.type = type as "LECTURE" | "EXAM" | "RETEST";
    if (from || to) {
      sessionFilter.date = {};
      if (from) (sessionFilter.date as { gte?: Date }).gte = new Date(`${from}T00:00:00.000Z`);
      if (to) (sessionFilter.date as { lte?: Date }).lte = new Date(`${to}T00:00:00.000Z`);
    }
    where.session = sessionFilter;
  }

  const [rows, total] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where,
      include: {
        session: {
          include: {
            batch: { select: { id: true, name: true } },
            subject: { select: { id: true, name: true } },
          },
        },
        markedBy: { select: { id: true, name: true } },
      },
      orderBy: { session: { date: "desc" } },
      skip: (p - 1) * ps,
      take: ps,
    }),
    prisma.attendanceRecord.count({ where }),
  ]);

  const homeBatchIds = Array.from(new Set(rows.map((r) => r.homeBatchId)));
  const homeBatches = await prisma.batch.findMany({
    where: { id: { in: homeBatchIds } },
    select: { id: true, name: true },
  });
  const homeBatchMap = new Map(homeBatches.map((b) => [b.id, b.name]));

  const data = rows.map((r) => ({
    id: r.id,
    date: r.session.date,
    type: r.session.type,
    status: r.status,
    method: r.method,
    batchName: r.session.batch.name,
    subjectName: r.session.subject?.name ?? null,
    homeBatchName: homeBatchMap.get(r.homeBatchId) ?? null,
    attendedBatchName: r.session.batch.name,
    isGuestInBatch: r.isGuestInBatch,
    markedAt: r.markedAt,
    markedBy: r.markedBy?.name ?? null,
    deviceInfo: r.deviceInfo,
    note: r.note,
    lateMinutes: r.lateMinutes,
    startTime: r.session.startTime,
    endTime: r.session.endTime,
  }));

  return paginated(res, data, { total, page: p, pageSize: ps });
});

attendanceRouter.get("/student/:studentId/stats", ...adminOrTeacher, async (req, res) => {
  const studentId = req.params.studentId as string;
  const tenantId = req.user!.tenantId;

  const student = await prisma.student.findFirst({
    where: { id: studentId, tenantId, deletedAt: null },
  });
  if (!student) throw Errors.notFound("Student");

  const records = await prisma.attendanceRecord.findMany({
    where: { tenantId, studentId },
    include: { session: { select: { type: true, date: true } } },
    orderBy: { session: { date: "asc" } },
  });

  const zero = () => ({ total: 0, present: 0, absent: 0, late: 0, excused: 0, percentage: 0 });
  type Bucket = ReturnType<typeof zero>;
  const overall: Bucket = zero();
  const byType: Record<"LECTURE" | "EXAM" | "RETEST", Bucket> = {
    LECTURE: zero(),
    EXAM: zero(),
    RETEST: zero(),
  };
  const monthMap = new Map<string, Bucket>();

  function add(b: Bucket, status: AttendanceStatus) {
    b.total += 1;
    if (status === "PRESENT") b.present += 1;
    else if (status === "ABSENT") b.absent += 1;
    else if (status === "LATE") b.late += 1;
    else if (status === "EXCUSED") b.excused += 1;
  }
  function finish(b: Bucket) {
    b.percentage = b.total > 0 ? Math.round(((b.present + b.late) / b.total) * 1000) / 10 : 0;
  }

  for (const r of records) {
    add(overall, r.status);
    add(byType[r.session.type], r.status);
    const monthKey = r.session.date.toISOString().slice(0, 7);
    let bucket = monthMap.get(monthKey);
    if (!bucket) {
      bucket = zero();
      monthMap.set(monthKey, bucket);
    }
    add(bucket, r.status);
  }
  finish(overall);
  for (const t of Object.values(byType)) finish(t);
  const byMonth = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, b]) => {
      finish(b);
      return { month, total: b.total, present: b.present, percentage: b.percentage };
    });

  // Streaks
  let currentStreakType: "present" | "absent" | null = null;
  let currentStreakDays = 0;
  let longestAbsentStreak = 0;
  let longestAbsentStart: Date | null = null;
  let longestAbsentEnd: Date | null = null;
  let runType: "present" | "absent" | null = null;
  let runStart: Date | null = null;
  let runEnd: Date | null = null;
  let runLen = 0;

  for (const r of records) {
    const isPresent = r.status === "PRESENT" || r.status === "LATE";
    const isAbsent = r.status === "ABSENT";
    const thisType: "present" | "absent" | null = isPresent
      ? "present"
      : isAbsent
        ? "absent"
        : null;
    if (thisType && runType === thisType) {
      runLen += 1;
      runEnd = r.session.date;
    } else {
      if (runType === "absent" && runLen > longestAbsentStreak) {
        longestAbsentStreak = runLen;
        longestAbsentStart = runStart;
        longestAbsentEnd = runEnd;
      }
      runType = thisType;
      runLen = thisType ? 1 : 0;
      runStart = thisType ? r.session.date : null;
      runEnd = r.session.date;
    }
  }
  if (runType === "absent" && runLen > longestAbsentStreak) {
    longestAbsentStreak = runLen;
    longestAbsentStart = runStart;
    longestAbsentEnd = runEnd;
  }
  if (records.length > 0) {
    const last = records[records.length - 1];
    if (last) {
      const lastIsPresent = last.status === "PRESENT" || last.status === "LATE";
      const lastIsAbsent = last.status === "ABSENT";
      currentStreakType = lastIsPresent ? "present" : lastIsAbsent ? "absent" : null;
      if (currentStreakType) {
        let count = 0;
        for (let i = records.length - 1; i >= 0; i--) {
          const rec = records[i];
          if (!rec) break;
          const matches =
            currentStreakType === "present"
              ? rec.status === "PRESENT" || rec.status === "LATE"
              : rec.status === "ABSENT";
          if (!matches) break;
          count += 1;
        }
        currentStreakDays = count;
      }
    }
  }

  return ok(res, {
    overall,
    byType,
    byMonth,
    currentStreak: currentStreakType ? { type: currentStreakType, days: currentStreakDays } : null,
    longestAbsentStreak:
      longestAbsentStreak > 0
        ? {
            days: longestAbsentStreak,
            from: longestAbsentStart,
            to: longestAbsentEnd,
          }
        : null,
  });
});

attendanceRouter.get("/absentees", ...adminOrTeacher, async (req, res) => {
  const { date } = req.query as Record<string, string | undefined>;
  const tenantId = req.user!.tenantId;
  const day = date ? new Date(`${date}T00:00:00.000Z`) : todayUTC();

  const rows = await prisma.attendanceRecord.findMany({
    where: {
      tenantId,
      status: "ABSENT",
      session: { date: day },
    },
    include: {
      student: {
        include: {
          user: { select: { id: true, name: true, phone: true } },
          batch: { select: { id: true, name: true } },
        },
      },
      session: {
        include: {
          batch: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [{ session: { startTime: "asc" } }],
  });

  return ok(res, {
    date: day,
    total: rows.length,
    absentees: rows.map((r) => ({
      recordId: r.id,
      studentId: r.studentId,
      studentName: r.student.user.name,
      studentPhone: r.student.user.phone,
      rollNumber: r.student.rollNumber,
      batch: r.student.batch,
      session: {
        id: r.session.id,
        batchName: r.session.batch.name,
        subjectName: r.session.subject?.name ?? null,
        type: r.session.type,
        startTime: r.session.startTime,
        endTime: r.session.endTime,
      },
    })),
  });
});

function todayUTC(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}
