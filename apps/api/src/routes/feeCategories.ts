import { prisma, withTenantTransaction } from "@/config/db";
import { Errors } from "@/lib/errors";
import { created, noContent, ok } from "@/lib/response";
import { authenticate, requireRole } from "@/middleware/auth";
import { validate } from "@/middleware/validate";
import { CreateFeeCategorySchema, UpdateFeeCategorySchema } from "@canop/types";
import { Router } from "express";

export const feeCategoriesRouter = Router();

feeCategoriesRouter.use(authenticate);

feeCategoriesRouter.get("/", async (req, res) => {
  const data = await prisma.feeCategory.findMany({
    where: { tenantId: req.user!.tenantId, deletedAt: null },
    orderBy: { name: "asc" },
  });
  return ok(res, data);
});

feeCategoriesRouter.post(
  "/",
  requireRole("ADMIN"),
  validate(CreateFeeCategorySchema),
  async (req, res) => {
    const cat = await withTenantTransaction(prisma, req.user!.tenantId, (tx) =>
      tx.feeCategory.create({ data: { tenantId: req.user!.tenantId, ...req.body } }),
    );
    return created(res, cat);
  },
);

feeCategoriesRouter.patch(
  "/:id",
  requireRole("ADMIN"),
  validate(UpdateFeeCategorySchema),
  async (req, res) => {
    const id = req.params.id as string;
    const cat = await prisma.feeCategory.findFirst({
      where: { id, tenantId: req.user!.tenantId, deletedAt: null },
    });
    if (!cat) throw Errors.notFound("Fee category");
    const updated = await withTenantTransaction(prisma, req.user!.tenantId, (tx) =>
      tx.feeCategory.update({ where: { id }, data: req.body }),
    );
    return ok(res, updated);
  },
);

feeCategoriesRouter.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  const id = req.params.id as string;
  const cat = await prisma.feeCategory.findFirst({
    where: { id, tenantId: req.user!.tenantId, deletedAt: null },
  });
  if (!cat) throw Errors.notFound("Fee category");
  await withTenantTransaction(prisma, req.user!.tenantId, (tx) =>
    tx.feeCategory.update({ where: { id }, data: { deletedAt: new Date() } }),
  );
  return noContent(res);
});
