import { z } from "zod";

export const NotificationChannelEnum = z.enum(["SMS", "WHATSAPP", "EMAIL", "IN_APP"]);
export type NotificationChannel = z.infer<typeof NotificationChannelEnum>;

export const AudienceTypeEnum = z.enum([
  "ALL_STUDENTS",
  "ALL_PARENTS",
  "ALL_MEMBERS",
  "BATCH",
  "CLASS",
  "CUSTOM",
]);
export type AudienceType = z.infer<typeof AudienceTypeEnum>;

export const CampaignStatusEnum = z.enum([
  "DRAFT",
  "SCHEDULED",
  "SENDING",
  "SENT",
  "FAILED",
  "CANCELLED",
]);
export type CampaignStatus = z.infer<typeof CampaignStatusEnum>;

export const DeliveryStatusEnum = z.enum([
  "QUEUED",
  "SENDING",
  "SENT",
  "DELIVERED",
  "READ",
  "FAILED",
  "REJECTED",
]);
export type DeliveryStatus = z.infer<typeof DeliveryStatusEnum>;

// ── Templates ─────────────────────────────────────────

export const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9_]+$/, "Slug must be lowercase, digits or underscores"),
  eventType: z.string().min(1).max(50),
  channel: NotificationChannelEnum,
  subject: z.string().max(300).optional(),
  body: z.string().min(1).max(4096),
});
export type CreateTemplate = z.infer<typeof CreateTemplateSchema>;

export const UpdateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  subject: z.string().max(300).nullable().optional(),
  body: z.string().min(1).max(4096).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateTemplate = z.infer<typeof UpdateTemplateSchema>;

export const PreviewTemplateSchema = z.object({
  body: z.string().optional(),
});
export type PreviewTemplate = z.infer<typeof PreviewTemplateSchema>;

// ── Broadcasts ─────────────────────────────────────────

export const AudienceFilterSchema = z.object({
  batchIds: z.array(z.string().uuid()).optional(),
  classIds: z.array(z.string().uuid()).optional(),
  studentIds: z.array(z.string().uuid()).optional(),
});
export type AudienceFilter = z.infer<typeof AudienceFilterSchema>;

export const CreateBroadcastSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(4096),
  channels: z.array(NotificationChannelEnum).min(1),
  audienceType: AudienceTypeEnum,
  audienceTypes: z.array(AudienceTypeEnum).optional(),
  audienceFilter: AudienceFilterSchema.optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
});
export type CreateBroadcast = z.infer<typeof CreateBroadcastSchema>;

// ── Notification Config ────────────────────────────────

export const NotificationConfigItemSchema = z.object({
  eventType: z.string().min(1).max(50),
  channel: NotificationChannelEnum,
  isEnabled: z.boolean(),
});

export const UpdateNotificationConfigSchema = z.object({
  items: z.array(NotificationConfigItemSchema),
});
export type UpdateNotificationConfig = z.infer<typeof UpdateNotificationConfigSchema>;
