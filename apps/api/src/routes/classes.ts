import { Router } from "express";
import { CreateClassSchema, UpdateClassSchema } from "@raquel/types";
import { prisma, withTenantTransaction } from "@/config/db";
import { Errors } from "@/lib/errors";
import { ok, created, noContent } from "@/lib/response";
import { authenticate, requireRole } from "@/middleware/auth";
import { validate } from "@/middleware/validate";

export const classesRouter = Router();

classesRouter.use(authenticate, requireRole("ADMIN", "STAFF"));

classesRouter.get("/", async (req, res) => {
  const data = await prisma.classStandard.findMany({
    where: { tenantId: req.user!.tenantId, deletedAt: null },
    orderBy: { orderIndex: "asc" },
  });
  return ok(res, data);
});

classesRouter.post("/", validate(CreateClassSchema), async (req, res) => {
  const cls = await withTenantTransaction(prisma, req.user!.tenantId, (tx) =>
    tx.classStandard.create({ data: { tenantId: req.user!.tenantId, ...req.body } }),
  );
  return created(res, cls);
});

classesRouter.patch("/:id", validate(UpdateClassSchema), async (req, res) => {
  const id = req.params.id as string;
  const cls = await prisma.classStandard.findFirst({
    where: { id, tenantId: req.user!.tenantId, deletedAt: null },
  });
  if (!cls) throw Errors.notFound("Class");
  const updated = await withTenantTransaction(prisma, req.user!.tenantId, (tx) =>
    tx.classStandard.update({ where: { id }, data: req.body }),
  );
  return ok(res, updated);
});

classesRouter.delete("/:id", async (req, res) => {
  const id = req.params.id as string;
  const cls = await prisma.classStandard.findFirst({
    where: { id, tenantId: req.user!.tenantId, deletedAt: null },
  });
  if (!cls) throw Errors.notFound("Class");
  await withTenantTransaction(prisma, req.user!.tenantId, (tx) =>
    tx.classStandard.update({ where: { id }, data: { deletedAt: new Date() } }),
  );
  return noContent(res);
});
