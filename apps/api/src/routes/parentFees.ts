import { prisma } from "@/config/db";
import { Errors } from "@/lib/errors";
import { ok } from "@/lib/response";
import { authenticate, requireRole } from "@/middleware/auth";
import { Router } from "express";

export const parentFeesRouter = Router();

parentFeesRouter.use(authenticate, requireRole("PARENT"));

parentFeesRouter.get("/children/:childId/fees", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const childId = req.params.childId as string;

  const guardian = await prisma.guardian.findFirst({
    where: { userId: req.user!.id, studentId: childId, tenantId },
  });
  if (!guardian) throw Errors.forbidden();

  const fees = await prisma.studentFee.findMany({
    where: { tenantId, studentId: childId },
    include: {
      plan: {
        include: {
          batch: { select: { id: true, name: true } },
          items: { include: { category: { select: { id: true, name: true } } } },
        },
      },
      installments: { orderBy: { installmentNumber: "asc" } },
      payments: { orderBy: { createdAt: "desc" } },
    },
  });
  return ok(res, fees);
});
