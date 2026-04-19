import { Router } from "express";
import { CreateBatchSchema, UpdateBatchSchema, BatchSubjectAssignSchema } from "@canop/types";
import { prisma, withTenantTransaction } from "@/config/db";
import { Errors } from "@/lib/errors";
import { ok, created, paginated } from "@/lib/response";
import { trackRecentItem } from "@/lib/search/recency";
import { authenticate, requireRole } from "@/middleware/auth";
import { validate } from "@/middleware/validate";

export const batchesRouter = Router();

batchesRouter.use(authenticate, requireRole("ADMIN", "TEACHER", "STAFF"));

batchesRouter.get("/", async (req, res) => {
  const data = await prisma.batch.findMany({
    where: { tenantId: req.user!.tenantId, deletedAt: null },
    include: {
      class: true,
      _count: { select: { students: { where: { deletedAt: null } } } },
      batchSubjects: { include: { subject: true, teacher: { select: { id: true, name: true } } } },
    },
    orderBy: { name: "asc" },
  });
  return ok(res, data);
});

batchesRouter.post("/", requireRole("ADMIN"), validate(CreateBatchSchema), async (req, res) => {
  const batch = await withTenantTransaction(prisma, req.user!.tenantId, (tx) =>
    tx.batch.create({
      data: { tenantId: req.user!.tenantId, ...req.body },
      include: { class: true },
    }),
  );
  return created(res, batch);
});

batchesRouter.get("/:id", async (req, res) => {
  const id = req.params.id as string;
  const batch = await prisma.batch.findFirst({
    where: { id, tenantId: req.user!.tenantId, deletedAt: null },
    include: {
      class: true,
      batchSubjects: { include: { subject: true, teacher: { select: { id: true, name: true } } } },
      _count: { select: { students: { where: { deletedAt: null } } } },
    },
  });
  if (!batch) throw Errors.notFound("Batch");
  void trackRecentItem(req.user!.tenantId, req.user!.id, "batch", id).catch(() => {});
  return ok(res, batch);
});

batchesRouter.patch("/:id", requireRole("ADMIN"), validate(UpdateBatchSchema), async (req, res) => {
  const id = req.params.id as string;
  const batch = await prisma.batch.findFirst({
    where: { id, tenantId: req.user!.tenantId, deletedAt: null },
  });
  if (!batch) throw Errors.notFound("Batch");
  const updated = await withTenantTransaction(prisma, req.user!.tenantId, (tx) =>
    tx.batch.update({ where: { id }, data: req.body, include: { class: true } }),
  );
  return ok(res, updated);
});

batchesRouter.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  const id = req.params.id as string;
  const batch = await prisma.batch.findFirst({
    where: { id, tenantId: req.user!.tenantId, deletedAt: null },
  });
  if (!batch) throw Errors.notFound("Batch");
  await withTenantTransaction(prisma, req.user!.tenantId, (tx) =>
    tx.batch.update({ where: { id }, data: { deletedAt: new Date() } }),
  );
  return ok(res, { deleted: true });
});

batchesRouter.post("/:id/subjects", requireRole("ADMIN"), validate(BatchSubjectAssignSchema), async (req, res) => {
  const id = req.params.id as string;
  const batch = await prisma.batch.findFirst({
    where: { id, tenantId: req.user!.tenantId, deletedAt: null },
  });
  if (!batch) throw Errors.notFound("Batch");

  await withTenantTransaction(prisma, req.user!.tenantId, async (tx) => {
    await tx.batchSubject.deleteMany({ where: { batchId: batch.id } });
    await tx.batchSubject.createMany({
      data: req.body.subjects.map((s: { subjectId: string; teacherId?: string }) => ({
        tenantId: req.user!.tenantId,
        batchId: batch.id,
        subjectId: s.subjectId,
        teacherId: s.teacherId || null,
      })),
    });
  });

  const updated = await prisma.batch.findUnique({
    where: { id: batch.id },
    include: {
      batchSubjects: { include: { subject: true, teacher: { select: { id: true, name: true } } } },
    },
  });
  return ok(res, updated);
});

batchesRouter.get("/:id/students", async (req, res) => {
  const id = req.params.id as string;
  const { page = "1", pageSize = "50" } = req.query as Record<string, string>;
  const p = Math.max(1, Number(page));
  const ps = Math.min(100, Math.max(1, Number(pageSize)));
  const where = { batchId: id, tenantId: req.user!.tenantId, deletedAt: null };
  const [data, total] = await Promise.all([
    prisma.student.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true, phone: true } } },
      skip: (p - 1) * ps,
      take: ps,
    }),
    prisma.student.count({ where }),
  ]);
  return paginated(res, data, { total, page: p, pageSize: ps });
});
