import { Router } from "express";
import { prisma, withTenantTransaction } from "@/config/db";
import { Errors } from "@/lib/errors";
import { ok, paginated } from "@/lib/response";
import { authenticate, requireRole } from "@/middleware/auth";

export const studentsRouter = Router();

studentsRouter.use(authenticate, requireRole("ADMIN", "TEACHER", "STAFF"));

studentsRouter.get("/", async (req, res) => {
  const { search, batchId, classId, page = "1", pageSize = "50" } = req.query as Record<string, string>;
  const p = Math.max(1, Number(page));
  const ps = Math.min(100, Math.max(1, Number(pageSize)));

  const where: Record<string, unknown> = {
    tenantId: req.user!.tenantId,
    deletedAt: null,
  };
  if (batchId) where.batchId = batchId;
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
