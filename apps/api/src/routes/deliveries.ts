import { prisma } from "@/config/db";
import { ok, paginated } from "@/lib/response";
import { authenticate, requireRole } from "@/middleware/auth";
import type { Prisma } from "@prisma/client";
import { Router } from "express";

export const deliveriesRouter = Router();

deliveriesRouter.use(authenticate, requireRole("ADMIN"));

deliveriesRouter.get("/", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const {
    eventType,
    channel,
    status,
    from,
    to,
    page = "1",
    pageSize = "50",
  } = req.query as Record<string, string | undefined>;
  const p = Math.max(1, Number(page));
  const ps = Math.min(200, Math.max(1, Number(pageSize)));

  const where: Prisma.MessageDeliveryWhereInput = { tenantId };
  if (eventType) where.eventType = eventType;
  if (channel) where.channel = channel as Prisma.MessageDeliveryWhereInput["channel"];
  if (status) where.status = status as Prisma.MessageDeliveryWhereInput["status"];
  if (from || to) {
    where.createdAt = {};
    if (from) (where.createdAt as { gte?: Date }).gte = new Date(from);
    if (to) (where.createdAt as { lte?: Date }).lte = new Date(to);
  }

  const [rows, total] = await Promise.all([
    prisma.messageDelivery.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (p - 1) * ps,
      take: ps,
    }),
    prisma.messageDelivery.count({ where }),
  ]);

  const recipientIds = Array.from(new Set(rows.map((r) => r.recipientId)));
  const users = await prisma.user.findMany({
    where: { id: { in: recipientIds }, tenantId },
    select: { id: true, name: true, role: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const data = rows.map((r) => ({
    ...r,
    recipient: userMap.get(r.recipientId) ?? null,
  }));

  return paginated(res, data, { total, page: p, pageSize: ps });
});

deliveriesRouter.get("/stats", async (req, res) => {
  const tenantId = req.user!.tenantId;

  const [byChannel, byStatus, byEvent, dailyRaw] = await Promise.all([
    prisma.messageDelivery.groupBy({
      by: ["channel"],
      where: { tenantId },
      _count: { _all: true },
    }),
    prisma.messageDelivery.groupBy({
      by: ["status"],
      where: { tenantId },
      _count: { _all: true },
    }),
    prisma.messageDelivery.groupBy({
      by: ["eventType"],
      where: { tenantId, eventType: { not: null } },
      _count: { _all: true },
    }),
    prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
      SELECT date_trunc('day', created_at)::date as day, COUNT(*)::bigint as count
      FROM message_deliveries
      WHERE tenant_id = ${tenantId}::uuid
        AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY 1 ORDER BY 1 ASC
    `.catch(() => [] as Array<{ day: Date; count: bigint }>),
  ]);

  const totalDeliveries = byStatus.reduce((s, r) => s + r._count._all, 0);
  const delivered = byStatus.find((r) => r.status === "DELIVERED")?._count._all ?? 0;
  const read = byStatus.find((r) => r.status === "READ")?._count._all ?? 0;
  const failed = byStatus.find((r) => r.status === "FAILED")?._count._all ?? 0;

  const deliveryRate = totalDeliveries > 0 ? (delivered + read) / totalDeliveries : 0;
  const whatsappTotal = byChannel.find((r) => r.channel === "WHATSAPP")?._count._all ?? 0;

  return ok(res, {
    totals: {
      sent: totalDeliveries,
      delivered,
      read,
      failed,
      deliveryRate: Math.round(deliveryRate * 1000) / 10,
    },
    byChannel: byChannel.map((r) => ({ channel: r.channel, count: r._count._all })),
    byStatus: byStatus.map((r) => ({ status: r.status, count: r._count._all })),
    byEvent: byEvent.map((r) => ({ eventType: r.eventType, count: r._count._all })),
    daily: dailyRaw.map((r) => ({
      day: r.day instanceof Date ? r.day.toISOString().slice(0, 10) : String(r.day),
      count: Number(r.count),
    })),
    whatsappTotal,
  });
});
