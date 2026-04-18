import { prisma } from "@/config/db";
import { emitToTenant } from "@/config/socket";
import { resolveTemplate } from "@/lib/template-engine";
import type { DeliveryStatus, NotificationChannel } from "@prisma/client";
import { sendEmail, sendSMS, sendWhatsApp } from "./gupshup.adapter";

export interface SendNotificationParams {
  tenantId: string;
  eventType: string;
  recipientUserId: string;
  context: Record<string, string>;
  channels?: NotificationChannel[];
  campaignId?: string;
}

const DEFAULT_CHANNELS: NotificationChannel[] = ["WHATSAPP", "SMS"];

interface DeliveryHandle {
  id: string;
  channel: NotificationChannel;
  status: DeliveryStatus;
}

/**
 * Sends a notification to a single recipient across the specified channels.
 * Resolves template per channel, respects consent + preferences, writes a
 * MessageDelivery record for each channel, then dispatches via the adapter.
 */
export async function sendNotification(params: SendNotificationParams): Promise<DeliveryHandle[]> {
  const { tenantId, eventType, recipientUserId, context, campaignId } = params;
  const channels = params.channels ?? DEFAULT_CHANNELS;

  if (!recipientUserId) return [];

  const user = await prisma.user.findFirst({
    where: { id: recipientUserId, tenantId, deletedAt: null },
    select: { id: true, name: true, email: true, phone: true },
  });
  if (!user) return [];

  const handles: DeliveryHandle[] = [];

  for (const channel of channels) {
    const pref = await prisma.notificationPreference.findFirst({
      where: { tenantId, userId: recipientUserId, channel, eventType },
    });
    if (pref && !pref.isEnabled) continue;

    const consent = await prisma.consentRecord.findFirst({
      where: { tenantId, userId: recipientUserId, channel, revokedAt: null },
      orderBy: { consentedAt: "desc" },
    });
    const consented = consent ? consent.consented : true;

    const template = await prisma.notificationTemplate.findFirst({
      where: { tenantId, eventType, channel, isActive: true },
    });
    if (!template) continue;

    const body = resolveTemplate(template.body, context);
    const subject = template.subject ? resolveTemplate(template.subject, context) : null;

    const recipientPhone = channel === "SMS" || channel === "WHATSAPP" ? user.phone : null;
    const recipientEmail = channel === "EMAIL" ? user.email : null;

    if (!consented) {
      const delivery = await prisma.messageDelivery.create({
        data: {
          tenantId,
          campaignId: campaignId ?? null,
          recipientId: recipientUserId,
          recipientPhone,
          recipientEmail,
          channel,
          eventType,
          message: body,
          status: "REJECTED",
          errorMessage: "Recipient opted out",
        },
      });
      handles.push({ id: delivery.id, channel, status: "REJECTED" });
      continue;
    }

    const delivery = await prisma.messageDelivery.create({
      data: {
        tenantId,
        campaignId: campaignId ?? null,
        recipientId: recipientUserId,
        recipientPhone,
        recipientEmail,
        channel,
        eventType,
        message: body,
        status: "QUEUED",
      },
    });

    void dispatchDelivery(delivery.id, {
      tenantId,
      channel,
      phone: recipientPhone,
      email: recipientEmail,
      subject,
      body,
    });

    handles.push({ id: delivery.id, channel, status: "QUEUED" });
  }

  if (handles.length > 0) {
    emitToTenant(tenantId, "notification:queued", {
      eventType,
      recipientUserId,
      count: handles.length,
    });
  }

  return handles;
}

interface DispatchArgs {
  tenantId: string;
  channel: NotificationChannel;
  phone: string | null;
  email: string | null;
  subject: string | null;
  body: string;
}

async function dispatchDelivery(deliveryId: string, args: DispatchArgs): Promise<void> {
  try {
    await prisma.messageDelivery.update({ where: { id: deliveryId }, data: { status: "SENDING" } });

    let result: { success: boolean; providerRef?: string; error?: string };
    if (args.channel === "SMS") {
      if (!args.phone) throw new Error("Missing recipient phone");
      result = await sendSMS(args.phone, args.body);
    } else if (args.channel === "WHATSAPP") {
      if (!args.phone) throw new Error("Missing recipient phone");
      result = await sendWhatsApp(args.phone, args.body);
    } else if (args.channel === "EMAIL") {
      if (!args.email) throw new Error("Missing recipient email");
      result = await sendEmail(args.email, args.subject ?? "Notification", args.body);
    } else {
      result = { success: true, providerRef: `in-app-${deliveryId}` };
    }

    if (result.success) {
      await prisma.messageDelivery.update({
        where: { id: deliveryId },
        data: {
          status: "SENT",
          providerRef: result.providerRef ?? null,
          sentAt: new Date(),
        },
      });
      // In local dev we simulate delivery receipt immediately.
      await prisma.messageDelivery.update({
        where: { id: deliveryId },
        data: { status: "DELIVERED", deliveredAt: new Date() },
      });

      const d = await prisma.messageDelivery.findUnique({
        where: { id: deliveryId },
        select: { campaignId: true, tenantId: true },
      });
      if (d?.campaignId) {
        await prisma.broadcastCampaign.update({
          where: { id: d.campaignId },
          data: { sentCount: { increment: 1 }, deliveredCount: { increment: 1 } },
        });
        emitToTenant(d.tenantId, "broadcast:progress", { campaignId: d.campaignId });
      }
    } else {
      await prisma.messageDelivery.update({
        where: { id: deliveryId },
        data: {
          status: "FAILED",
          errorMessage: (result.error ?? "Unknown error").slice(0, 500),
        },
      });
      const d = await prisma.messageDelivery.findUnique({
        where: { id: deliveryId },
        select: { campaignId: true, tenantId: true },
      });
      if (d?.campaignId) {
        await prisma.broadcastCampaign.update({
          where: { id: d.campaignId },
          data: { failedCount: { increment: 1 } },
        });
        emitToTenant(d.tenantId, "broadcast:progress", { campaignId: d.campaignId });
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.messageDelivery
      .update({
        where: { id: deliveryId },
        data: { status: "FAILED", errorMessage: message.slice(0, 500) },
      })
      .catch(() => {});
  }
}

/**
 * Safe wrapper — callers shouldn't need to know about template absence
 * or missing recipient IDs. Swallows errors so business logic never
 * breaks because of notification failures.
 */
export async function notifySafe(params: SendNotificationParams): Promise<void> {
  try {
    await sendNotification(params);
  } catch (err) {
    console.error("[notify] failed", err);
  }
}
