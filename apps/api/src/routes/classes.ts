import { Router } from "express";
import { CreateClassSchema, UpdateClassSchema } from "@raquel/types";
import { prisma, withTenantTransaction } from "@/config/db";
import { emitToTenant } from "@/config/socket";
import { Errors } from "@/lib/errors";
import { ok, created, noContent } from "@/lib/response";
import { authenticate, requireRole } from "@/middleware/auth";
import { validate } from "@/middleware/validate";

export const classesRouter = Router();

classesRouter.use(authenticate, requireRole("ADMIN", "TEACHER", "STAFF"));

classesRouter.get("/", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const includeSubjects = req.query.includeSubjects === "true";

  const classes = await withTenantTransaction(prisma, tenantId, async (tx) => {
    const rows = await tx.classStandard.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { orderIndex: "asc" },
    });

    if (!includeSubjects) return rows;

    const subjects = await tx.subject.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { name: "asc" },
    });

    const batchCounts = await tx.batch.groupBy({
      by: ["classId"],
      where: { deletedAt: null, classId: { in: rows.map((c) => c.id) } },
      _count: true,
    });
    const countMap = new Map(batchCounts.map((b) => [b.classId, b._count]));

    return rows.map((c) => ({
      ...c,
      subjects,
      batchCount: countMap.get(c.id) || 0,
    }));
  });

  return ok(res, classes);
});

classesRouter.post(
  "/",
  requireRole("ADMIN"),
  validate(CreateClassSchema),
  async (req, res) => {
    const tenantId = req.user!.tenantId;
    const cls = await withTenantTransaction(prisma, tenantId, (tx) =>
      tx.classStandard.create({ data: { tenantId, ...req.body } }),
    );
    emitToTenant(tenantId, "class:created", { classId: cls.id, name: cls.name });
    return created(res, cls);
  },
);

classesRouter.patch(
  "/:id",
  requireRole("ADMIN"),
  validate(UpdateClassSchema),
  async (req, res) => {
    const id = req.params.id as string;
    const tenantId = req.user!.tenantId;
    const cls = await prisma.classStandard.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!cls) throw Errors.notFound("Class");
    const updated = await withTenantTransaction(prisma, tenantId, (tx) =>
      tx.classStandard.update({ where: { id }, data: req.body }),
    );
    emitToTenant(tenantId, "class:updated", { classId: updated.id });
    return ok(res, updated);
  },
);

classesRouter.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  const id = req.params.id as string;
  const tenantId = req.user!.tenantId;
  const cls = await prisma.classStandard.findFirst({
    where: { id, tenantId, deletedAt: null },
  });
  if (!cls) throw Errors.notFound("Class");

  const batchCount = await prisma.batch.count({
    where: { classId: id, deletedAt: null },
  });
  if (batchCount > 0) {
    throw Errors.badRequest(
      `Cannot delete class: ${batchCount} batch${batchCount === 1 ? "" : "es"} still linked. Remove or reassign them first.`,
      "CLASS_IN_USE",
    );
  }

  await withTenantTransaction(prisma, tenantId, (tx) =>
    tx.classStandard.update({ where: { id }, data: { deletedAt: new Date() } }),
  );
  emitToTenant(tenantId, "class:deleted", { classId: id });
  return noContent(res);
});
