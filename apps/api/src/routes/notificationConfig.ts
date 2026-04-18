import { prisma, withTenantTransaction } from "@/config/db";
import { ok } from "@/lib/response";
import { authenticate, requireRole } from "@/middleware/auth";
import { validate } from "@/middleware/validate";
import { UpdateNotificationConfigSchema } from "@raquel/types";
import { Router } from "express";

export const notificationConfigRouter = Router();

notificationConfigRouter.use(authenticate, requireRole("ADMIN"));

// Tenant-level admin user acts as the canonical holder of event×channel toggles.
// Each tenant has a per-admin NotificationPreference row per event/channel pair.

notificationConfigRouter.get("/", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const rows = await prisma.notificationPreference.findMany({
    where: { tenantId, userId: req.user!.id },
  });
  return ok(res, rows);
});

notificationConfigRouter.patch(
  "/",
  validate(UpdateNotificationConfigSchema),
  async (req, res) => {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;
    const body = req.body as import("@raquel/types").UpdateNotificationConfig;

    const saved = await withTenantTransaction(prisma, tenantId, async (tx) => {
      const out = [] as Awaited<ReturnType<typeof tx.notificationPreference.upsert>>[];
      for (const item of body.items) {
        const row = await tx.notificationPreference.upsert({
          where: {
            userId_channel_eventType: {
              userId,
              channel: item.channel,
              eventType: item.eventType,
            },
          },
          update: { isEnabled: item.isEnabled },
          create: {
            tenantId,
            userId,
            channel: item.channel,
            eventType: item.eventType,
            isEnabled: item.isEnabled,
          },
        });
        out.push(row);
      }
      return out;
    });
    return ok(res, saved);
  },
);
