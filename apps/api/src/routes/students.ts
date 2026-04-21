import { Router } from "express";
import { z } from "zod";
import { prisma, withTenantTransaction } from "@/config/db";
import { emitToTenant } from "@/config/socket";
import { Errors } from "@/lib/errors";
import { ok, paginated } from "@/lib/response";
import { trackRecentItem } from "@/lib/search/recency";
import { authenticate, requireRole } from "@/middleware/auth";
import { validate } from "@/middleware/validate";
import { generateStudentReportPdf } from "@/services/student-report.service";

export const studentsRouter = Router();

studentsRouter.use(authenticate, requireRole("ADMIN", "TEACHER", "STAFF"));

const BatchAssignSchema = z.object({
  studentIds: z.array(z.string().uuid()).min(1),
  batchId: z.string().uuid(),
});
const BatchTransferSchema = z.object({
  studentIds: z.array(z.string().uuid()).min(1),
  sourceBatchId: z.string().uuid(),
  batchId: z.string().uuid(),
});

studentsRouter.get("/", async (req, res) => {
  const { search, batchId, classId, page = "1", pageSize = "50" } = req.query as Record<string, string>;
  const p = Math.max(1, Number(page));
  const ps = Math.min(100, Math.max(1, Number(pageSize)));

  const where: Record<string, unknown> = {
    tenantId: req.user!.tenantId,
    deletedAt: null,
  };
  if (batchId) {
    // Match students in this batch either via primary batchId OR via the StudentBatch join table
    where.OR = [
      { batchId },
      { batches: { some: { batchId, leftAt: null } } },
    ];
  }
  if (classId) where.classId = classId;
  if (search) {
    where.user = { name: { contains: search, mode: "insensitive" } };
  }

  const [data, total] = await Promise.all([
    prisma.student.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, isActive: true } },
        batch: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
        batches: {
          where: { leftAt: null },
          include: { batch: { select: { id: true, name: true } } },
        },
      },
      skip: (p - 1) * ps,
      take: ps,
      orderBy: { user: { name: "asc" } },
    }),
    prisma.student.count({ where }),
  ]);
  return paginated(res, data, { total, page: p, pageSize: ps });
});

studentsRouter.get("/:id", async (req, res) => {
  const id = req.params.id as string;
  const student = await prisma.student.findFirst({
    where: { id, tenantId: req.user!.tenantId, deletedAt: null },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, isActive: true, lastLoginAt: true } },
      batch: { select: { id: true, name: true } },
      class: { select: { id: true, name: true } },
      guardians: true,
    },
  });
  if (!student) throw Errors.notFound("Student");
  void trackRecentItem(req.user!.tenantId, req.user!.id, "student", id).catch(() => {});
  return ok(res, student);
});

studentsRouter.patch("/:id", requireRole("ADMIN"), async (req, res) => {
  const id = req.params.id as string;
  const student = await prisma.student.findFirst({
    where: { id, tenantId: req.user!.tenantId, deletedAt: null },
  });
  if (!student) throw Errors.notFound("Student");

  const { batchId, classId, rollNumber } = req.body;
  const updated = await withTenantTransaction(prisma, req.user!.tenantId, (tx) =>
    tx.student.update({
      where: { id: student.id },
      data: {
        ...(batchId !== undefined && { batchId }),
        ...(classId !== undefined && { classId }),
        ...(rollNumber !== undefined && { rollNumber }),
      },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        batch: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
      },
    }),
  );
  return ok(res, updated);
});

studentsRouter.post(
  "/batch-assign",
  requireRole("ADMIN"),
  validate(BatchAssignSchema),
  async (req, res) => {
    const tenantId = req.user!.tenantId;
    const { studentIds, batchId } = req.body as { studentIds: string[]; batchId: string };

    const batch = await prisma.batch.findFirst({
      where: { id: batchId, tenantId, deletedAt: null },
    });
    if (!batch) throw Errors.notFound("Batch");

    const students = await prisma.student.findMany({
      where: { id: { in: studentIds }, tenantId, deletedAt: null },
      select: { id: true, batchId: true },
    });
    if (students.length !== studentIds.length) {
      throw Errors.badRequest("Some students were not found", "STUDENTS_NOT_FOUND");
    }

    const result = await withTenantTransaction(prisma, tenantId, async (tx) => {
      let created = 0;
      for (const s of students) {
        const existing = await tx.studentBatch.findUnique({
          where: { studentId_batchId: { studentId: s.id, batchId } },
        });
        if (existing) {
          if (existing.leftAt) {
            await tx.studentBatch.update({
              where: { id: existing.id },
              data: { leftAt: null, joinedAt: new Date() },
            });
            created += 1;
          }
          continue;
        }
        await tx.studentBatch.create({
          data: {
            tenantId,
            studentId: s.id,
            batchId,
            isPrimary: s.batchId === null,
          },
        });
        if (s.batchId === null) {
          await tx.student.update({ where: { id: s.id }, data: { batchId } });
        }
        created += 1;
      }
      return { added: created };
    });

    emitToTenant(tenantId, "students:batch:assigned", { batchId, studentIds });
    emitToTenant(tenantId, "stats:updated", {});

    return ok(res, { ...result, batchId, studentIds });
  },
);

studentsRouter.post(
  "/batch-remove",
  requireRole("ADMIN"),
  validate(BatchAssignSchema),
  async (req, res) => {
    const tenantId = req.user!.tenantId;
    const { studentIds, batchId } = req.body as { studentIds: string[]; batchId: string };

    const result = await withTenantTransaction(prisma, tenantId, async (tx) => {
      const res1 = await tx.studentBatch.updateMany({
        where: { batchId, studentId: { in: studentIds }, leftAt: null },
        data: { leftAt: new Date() },
      });

      const primaryStudents = await tx.student.findMany({
        where: { id: { in: studentIds }, batchId },
        select: { id: true },
      });
      for (const s of primaryStudents) {
        const nextActive = await tx.studentBatch.findFirst({
          where: { studentId: s.id, leftAt: null, batchId: { not: batchId } },
          orderBy: { joinedAt: "desc" },
        });
        await tx.student.update({
          where: { id: s.id },
          data: { batchId: nextActive?.batchId ?? null },
        });
      }
      return { removed: res1.count };
    });

    emitToTenant(tenantId, "students:batch:removed", { batchId, studentIds });
    emitToTenant(tenantId, "stats:updated", {});

    return ok(res, { ...result, batchId, studentIds });
  },
);

studentsRouter.post(
  "/batch-transfer",
  requireRole("ADMIN"),
  validate(BatchTransferSchema),
  async (req, res) => {
    const tenantId = req.user!.tenantId;
    const { studentIds, sourceBatchId, batchId } = req.body as {
      studentIds: string[];
      sourceBatchId: string;
      batchId: string;
    };
    if (sourceBatchId === batchId) {
      throw Errors.badRequest("Source and target batches must differ", "SAME_BATCH");
    }

    const result = await withTenantTransaction(prisma, tenantId, async (tx) => {
      await tx.studentBatch.updateMany({
        where: { batchId: sourceBatchId, studentId: { in: studentIds }, leftAt: null },
        data: { leftAt: new Date() },
      });
      for (const studentId of studentIds) {
        const existing = await tx.studentBatch.findUnique({
          where: { studentId_batchId: { studentId, batchId } },
        });
        if (existing) {
          await tx.studentBatch.update({
            where: { id: existing.id },
            data: { leftAt: null, joinedAt: new Date(), isPrimary: true },
          });
        } else {
          await tx.studentBatch.create({
            data: { tenantId, studentId, batchId, isPrimary: true },
          });
        }
        await tx.student.update({ where: { id: studentId }, data: { batchId } });
      }
      return { transferred: studentIds.length };
    });

    emitToTenant(tenantId, "students:batch:transferred", {
      fromBatchId: sourceBatchId,
      toBatchId: batchId,
      studentIds,
    });
    emitToTenant(tenantId, "stats:updated", {});

    return ok(res, { ...result, sourceBatchId, batchId, studentIds });
  },
);

studentsRouter.get("/:id/report", async (req, res) => {
  const id = req.params.id as string;
  const tenantId = req.user!.tenantId;
  const student = await prisma.student.findFirst({
    where: { id, tenantId, deletedAt: null },
    include: { user: { select: { name: true } } },
  });
  if (!student) throw Errors.notFound("Student");

  try {
    const pdf = await generateStudentReportPdf({ studentId: id, tenantId });
    const fileName = `${student.user.name.replace(/[^a-zA-Z0-9]/g, "-")}-report.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Length", String(pdf.length));
    res.send(pdf);
  } catch {
    throw Errors.internal("Failed to generate report");
  }
});

studentsRouter.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  const id = req.params.id as string;
  const student = await prisma.student.findFirst({
    where: { id, tenantId: req.user!.tenantId, deletedAt: null },
  });
  if (!student) throw Errors.notFound("Student");
  await withTenantTransaction(prisma, req.user!.tenantId, async (tx) => {
    await tx.student.update({ where: { id: student.id }, data: { deletedAt: new Date() } });
    await tx.user.update({ where: { id: student.userId }, data: { isActive: false } });
  });
  return ok(res, { deleted: true });
});
