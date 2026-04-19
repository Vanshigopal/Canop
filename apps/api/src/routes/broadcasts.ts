import { prisma, withTenantTransaction } from "@/config/db";
import { emitToTenant } from "@/config/socket";
import { Errors } from "@/lib/errors";
import { ok, paginated } from "@/lib/response";
import { SAMPLE_CONTEXT, resolveTemplate } from "@/lib/template-engine";
import { authenticate, requireRole } from "@/middleware/auth";
import { validate } from "@/middleware/validate";
import { sendEmail, sendSMS, sendWhatsApp } from "@/services/gupshup.adapter";
import { Prisma } from "@prisma/client";
import type { AudienceFilter, AudienceType, NotificationChannel } from "@canop/types";
import { CreateBroadcastSchema } from "@canop/types";
import { Router } from "express";

export const broadcastsRouter = Router();

broadcastsRouter.use(authenticate);

broadcastsRouter.get("/", requireRole("ADMIN", "TEACHER"), async (req, res) => {
  const tenantId = req.user!.tenantId;
  const {
    status,
    page = "1",
    pageSize = "50",
  } = req.query as Record<string, string | undefined>;
  const p = Math.max(1, Number(page));
  const ps = Math.min(100, Math.max(1, Number(pageSize)));

  const where: Prisma.BroadcastCampaignWhereInput = { tenantId };
  if (status) where.status = status as Prisma.BroadcastCampaignWhereInput["status"];

  const [rows, total] = await Promise.all([
    prisma.broadcastCampaign.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true } },
        _count: { select: { deliveries: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (p - 1) * ps,
      take: ps,
    }),
    prisma.broadcastCampaign.count({ where }),
  ]);
  return paginated(res, rows, { total, page: p, pageSize: ps });
});

broadcastsRouter.post(
  "/",
  requireRole("ADMIN", "TEACHER"),
  validate(CreateBroadcastSchema),
  async (req, res) => {
    const tenantId = req.user!.tenantId;
    const body = req.body as import("@canop/types").CreateBroadcast;

    if (req.user!.role === "TEACHER") {
      const perms = await prisma.permission.findFirst({
        where: { tenantId, userId: req.user!.id },
      });
      if (!perms?.canSendBroadcasts) throw Errors.forbidden();
    }

    const recipients = await resolveAudience(tenantId, body.audienceType, body.audienceFilter);
    if (recipients.length === 0) {
      throw Errors.badRequest("Audience resolved to 0 recipients", "AUDIENCE_EMPTY");
    }

    const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
    const immediate = !scheduledAt || scheduledAt.getTime() <= Date.now();

    const campaign = await withTenantTransaction(prisma, tenantId, (tx) =>
      tx.broadcastCampaign.create({
        data: {
          tenantId,
          title: body.title,
          message: body.message,
          channels: body.channels,
          audienceType: body.audienceType,
          audienceFilter: body.audienceFilter
            ? (body.audienceFilter as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          recipientCount: recipients.length * body.channels.length,
          scheduledAt,
          status: immediate ? "SENDING" : "SCHEDULED",
          sentAt: immediate ? new Date() : null,
          createdById: req.user!.id,
        },
      }),
    );

    if (immediate) {
      void dispatchCampaign(campaign.id, tenantId, recipients, body.channels, body.message);
    } else if (scheduledAt) {
      const delay = scheduledAt.getTime() - Date.now();
      setTimeout(() => {
        void dispatchCampaign(campaign.id, tenantId, recipients, body.channels, body.message);
      }, delay).unref?.();
    }

    emitToTenant(tenantId, "broadcast:created", {
      campaignId: campaign.id,
      status: campaign.status,
    });

    return ok(res, campaign, 201);
  },
);

broadcastsRouter.get("/:id", requireRole("ADMIN", "TEACHER"), async (req, res) => {
  const row = await prisma.broadcastCampaign.findFirst({
    where: { id: req.params.id as string, tenantId: req.user!.tenantId },
    include: {
      createdBy: { select: { id: true, name: true } },
      _count: { select: { deliveries: true } },
    },
  });
  if (!row) throw Errors.notFound("Campaign");
  return ok(res, row);
});

broadcastsRouter.post(
  "/:id/cancel",
  requireRole("ADMIN"),
  async (req, res) => {
    const tenantId = req.user!.tenantId;
    const id = req.params.id as string;
    const camp = await prisma.broadcastCampaign.findFirst({ where: { id, tenantId } });
    if (!camp) throw Errors.notFound("Campaign");
    if (camp.status !== "SCHEDULED") {
      throw Errors.badRequest("Only scheduled campaigns can be cancelled");
    }
    const updated = await withTenantTransaction(prisma, tenantId, (tx) =>
      tx.broadcastCampaign.update({ where: { id }, data: { status: "CANCELLED" } }),
    );
    emitToTenant(tenantId, "broadcast:cancelled", { campaignId: id });
    return ok(res, updated);
  },
);

broadcastsRouter.get(
  "/:id/deliveries",
  requireRole("ADMIN", "TEACHER"),
  async (req, res) => {
    const tenantId = req.user!.tenantId;
    const id = req.params.id as string;
    const camp = await prisma.broadcastCampaign.findFirst({ where: { id, tenantId } });
    if (!camp) throw Errors.notFound("Campaign");
    const rows = await prisma.messageDelivery.findMany({
      where: { tenantId, campaignId: id },
      orderBy: { createdAt: "desc" },
    });
    const recipientIds = Array.from(new Set(rows.map((r) => r.recipientId)));
    const users = await prisma.user.findMany({
      where: { id: { in: recipientIds }, tenantId },
      select: { id: true, name: true, role: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));
    return ok(
      res,
      rows.map((r) => ({
        ...r,
        recipient: userMap.get(r.recipientId) ?? null,
      })),
    );
  },
);

// ── Audience resolution ──────────────────────────────────

async function resolveAudience(
  tenantId: string,
  type: AudienceType,
  filter?: AudienceFilter,
): Promise<string[]> {
  if (type === "ALL_STUDENTS") {
    const studentUsers = await prisma.student.findMany({
      where: { tenantId, deletedAt: null },
      select: { userId: true },
    });
    return studentUsers.map((s) => s.userId);
  }

  if (type === "ALL_PARENTS") {
    const guardians = await prisma.guardian.findMany({
      where: { tenantId, userId: { not: null } },
      select: { userId: true },
    });
    return Array.from(new Set(guardians.map((g) => g.userId!)));
  }

  if (type === "ALL_MEMBERS") {
    const users = await prisma.user.findMany({
      where: { tenantId, deletedAt: null, isActive: true },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  if (type === "BATCH") {
    const batchIds = filter?.batchIds ?? [];
    if (batchIds.length === 0) return [];
    const students = await prisma.student.findMany({
      where: { tenantId, batchId: { in: batchIds }, deletedAt: null },
      select: { userId: true, id: true },
    });
    const guardians = await prisma.guardian.findMany({
      where: { tenantId, studentId: { in: students.map((s) => s.id) }, userId: { not: null } },
      select: { userId: true },
    });
    return Array.from(new Set([...students.map((s) => s.userId), ...guardians.map((g) => g.userId!)]));
  }

  if (type === "CLASS") {
    const classIds = filter?.classIds ?? [];
    if (classIds.length === 0) return [];
    const students = await prisma.student.findMany({
      where: { tenantId, classId: { in: classIds }, deletedAt: null },
      select: { userId: true, id: true },
    });
    const guardians = await prisma.guardian.findMany({
      where: { tenantId, studentId: { in: students.map((s) => s.id) }, userId: { not: null } },
      select: { userId: true },
    });
    return Array.from(new Set([...students.map((s) => s.userId), ...guardians.map((g) => g.userId!)]));
  }

  if (type === "CUSTOM") {
    const ids = filter?.studentIds ?? [];
    if (ids.length === 0) return [];
    const students = await prisma.student.findMany({
      where: { tenantId, id: { in: ids }, deletedAt: null },
      select: { userId: true, id: true },
    });
    const guardians = await prisma.guardian.findMany({
      where: { tenantId, studentId: { in: students.map((s) => s.id) }, userId: { not: null } },
      select: { userId: true },
    });
    return Array.from(new Set([...students.map((s) => s.userId), ...guardians.map((g) => g.userId!)]));
  }

  return [];
}

async function dispatchCampaign(
  campaignId: string,
  tenantId: string,
  recipientIds: string[],
  channels: NotificationChannel[],
  template: string,
): Promise<void> {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });
    for (const userId of recipientIds) {
      const user = await prisma.user.findFirst({
        where: { id: userId, tenantId, deletedAt: null },
        include: {
          student: { include: { batch: { select: { name: true } } } },
          guardianOf: {
            take: 1,
            include: { student: { include: { user: { select: { name: true } } } } },
          },
        },
      });
      if (!user) continue;

      const baseContext: Record<string, string> = {
        ...SAMPLE_CONTEXT,
        institute_name: tenant?.name ?? "",
        date: new Date().toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
      };
      if (user.student) {
        baseContext.student_name = user.name;
        baseContext.student_batch = user.student.batch?.name ?? "";
      }
      if (user.guardianOf[0]) {
        baseContext.parent_name = user.name;
        baseContext.student_name = user.guardianOf[0].student.user.name;
      }
      const body = resolveTemplate(template, baseContext);

      for (const channel of channels) {
        const recipientPhone = channel === "SMS" || channel === "WHATSAPP" ? user.phone : null;
        const recipientEmail = channel === "EMAIL" ? user.email : null;

        const consent = await prisma.consentRecord.findFirst({
          where: { tenantId, userId: user.id, channel, revokedAt: null },
          orderBy: { consentedAt: "desc" },
        });
        const consented = consent ? consent.consented : true;

        if (!consented) {
          await prisma.messageDelivery.create({
            data: {
              tenantId,
              campaignId,
              recipientId: user.id,
              recipientPhone,
              recipientEmail,
              channel,
              message: body,
              status: "REJECTED",
              errorMessage: "Recipient opted out",
            },
          });
          continue;
        }

        const delivery = await prisma.messageDelivery.create({
          data: {
            tenantId,
            campaignId,
            recipientId: user.id,
            recipientPhone,
            recipientEmail,
            channel,
            message: body,
            status: "SENDING",
          },
        });

        let result: { success: boolean; providerRef?: string; error?: string };
        if (channel === "SMS") {
          result = recipientPhone
            ? await sendSMS(recipientPhone, body)
            : { success: false, error: "Missing phone" };
        } else if (channel === "WHATSAPP") {
          result = recipientPhone
            ? await sendWhatsApp(recipientPhone, body)
            : { success: false, error: "Missing phone" };
        } else if (channel === "EMAIL") {
          result = recipientEmail
            ? await sendEmail(recipientEmail, "Broadcast", body)
            : { success: false, error: "Missing email" };
        } else {
          result = { success: true, providerRef: `in-app-${delivery.id}` };
        }

        if (result.success) {
          await prisma.messageDelivery.update({
            where: { id: delivery.id },
            data: {
              status: "DELIVERED",
              providerRef: result.providerRef ?? null,
              sentAt: new Date(),
              deliveredAt: new Date(),
            },
          });
          await prisma.broadcastCampaign.update({
            where: { id: campaignId },
            data: { sentCount: { increment: 1 }, deliveredCount: { increment: 1 } },
          });
        } else {
          await prisma.messageDelivery.update({
            where: { id: delivery.id },
            data: {
              status: "FAILED",
              errorMessage: (result.error ?? "Unknown error").slice(0, 500),
            },
          });
          await prisma.broadcastCampaign.update({
            where: { id: campaignId },
            data: { failedCount: { increment: 1 } },
          });
        }

        emitToTenant(tenantId, "broadcast:progress", { campaignId });
      }
    }

    await prisma.broadcastCampaign.update({
      where: { id: campaignId },
      data: { status: "SENT" },
    });
    emitToTenant(tenantId, "broadcast:sent", { campaignId });
  } catch (err) {
    console.error("[broadcast] dispatch failed", err);
    await prisma.broadcastCampaign
      .update({ where: { id: campaignId }, data: { status: "FAILED" } })
      .catch(() => {});
  }
}
