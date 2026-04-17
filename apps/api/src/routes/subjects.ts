import { Router } from "express";
import { CreateSubjectSchema, UpdateSubjectSchema } from "@raquel/types";
import { prisma, withTenantTransaction } from "@/config/db";
import { Errors } from "@/lib/errors";
import { ok, created, paginated, noContent } from "@/lib/response";
import { authenticate, requireRole } from "@/middleware/auth";
import { validate } from "@/middleware/validate";

export const subjectsRouter = Router();

subjectsRouter.use(authenticate, requireRole("ADMIN", "TEACHER", "STAFF"));

subjectsRouter.get("/", async (req, res) => {
  const { search, page = "1", pageSize = "50" } = req.query as Record<string, string>;
  const p = Math.max(1, Number(page));
  const ps = Math.min(100, Math.max(1, Number(pageSize)));
  const where = {
    tenantId: req.user!.tenantId,
    deletedAt: null,
    ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
  };
  const [data, total] = await Promise.all([
    prisma.subject.findMany({ where, skip: (p - 1) * ps, take: ps, orderBy: { name: "asc" } }),
    prisma.subject.count({ where }),
  ]);
  return paginated(res, data, { total, page: p, pageSize: ps });
});

subjectsRouter.post("/", requireRole("ADMIN"), validate(CreateSubjectSchema), async (req, res) => {
  const subject = await withTenantTransaction(prisma, req.user!.tenantId, (tx) =>
    tx.subject.create({ data: { tenantId: req.user!.tenantId, ...req.body } }),
  );
  return created(res, subject);
});

subjectsRouter.get("/:id", async (req, res) => {
  const id = req.params.id as string;
  const subject = await prisma.subject.findFirst({
    where: { id, tenantId: req.user!.tenantId, deletedAt: null },
  });
  if (!subject) throw Errors.notFound("Subject");
  return ok(res, subject);
});

subjectsRouter.patch("/:id", requireRole("ADMIN"), validate(UpdateSubjectSchema), async (req, res) => {
  const id = req.params.id as string;
  const subject = await prisma.subject.findFirst({
    where: { id, tenantId: req.user!.tenantId, deletedAt: null },
  });
  if (!subject) throw Errors.notFound("Subject");
  const updated = await withTenantTransaction(prisma, req.user!.tenantId, (tx) =>
    tx.subject.update({ where: { id }, data: req.body }),
  );
  return ok(res, updated);
});

subjectsRouter.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  const id = req.params.id as string;
  const subject = await prisma.subject.findFirst({
    where: { id, tenantId: req.user!.tenantId, deletedAt: null },
  });
  if (!subject) throw Errors.notFound("Subject");
  await withTenantTransaction(prisma, req.user!.tenantId, (tx) =>
    tx.subject.update({ where: { id }, data: { deletedAt: new Date() } }),
  );
  return noContent(res);
});
