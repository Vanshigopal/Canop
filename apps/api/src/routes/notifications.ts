import { Router } from "express";
import { prisma, withTenantTransaction } from "@/config/db";
import { ok } from "@/lib/response";
import { authenticate } from "@/middleware/auth";

export const notificationsRouter = Router();

notificationsRouter.use(authenticate);

notificationsRouter.get("/inbox", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const cursor = (req.query.cursor as string | undefined) ?? undefined;
  const onlyUnread = req.query.unread === "true";
  const tenantId = req.user!.tenantId;

  const deliveries = await withTenantTransaction(prisma, tenantId, async (tx) => {
    return tx.messageDelivery.findMany({
      where: {
        tenantId,
        recipientId: req.user!.id,
        ...(onlyUnread ? { readAt: null } : {}),
      },
      include: {
        campaign: {
          select: {
            title: true,
            createdBy: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
  });

  return ok(res, deliveries);
});

notificationsRouter.post("/:id/mark-read", async (req, res) => {
  const tenantId = req.user!.tenantId;
  await withTenantTransaction(prisma, tenantId, async (tx) => {
    await tx.messageDelivery.updateMany({
      where: { id: req.params.id, tenantId, recipientId: req.user!.id, readAt: null },
      data: { readAt: new Date() },
    });
  });
  return ok(res, { success: true });
});

notificationsRouter.post("/mark-all-read", async (req, res) => {
  const tenantId = req.user!.tenantId;
  await withTenantTransaction(prisma, tenantId, async (tx) => {
    await tx.messageDelivery.updateMany({
      where: { tenantId, recipientId: req.user!.id, readAt: null },
      data: { readAt: new Date() },
    });
  });
  return ok(res, { success: true });
});

notificationsRouter.get("/unread-count", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const count = await prisma.messageDelivery.count({
    where: { tenantId, recipientId: req.user!.id, readAt: null },
  });
  return ok(res, { count });
});
