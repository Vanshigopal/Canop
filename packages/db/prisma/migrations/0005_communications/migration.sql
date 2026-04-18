-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('SMS', 'WHATSAPP', 'EMAIL', 'IN_APP');

-- CreateEnum
CREATE TYPE "AudienceType" AS ENUM ('ALL_STUDENTS', 'ALL_PARENTS', 'ALL_MEMBERS', 'BATCH', 'CLASS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'REJECTED');

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "subject" VARCHAR(300),
    "body" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_templates_tenant_id_idx" ON "notification_templates"("tenant_id");

-- CreateIndex
CREATE INDEX "notification_templates_tenant_id_event_type_idx" ON "notification_templates"("tenant_id", "event_type");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_tenant_id_slug_channel_key" ON "notification_templates"("tenant_id", "slug", "channel");

-- AddForeignKey
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "broadcast_campaigns" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "channels" "NotificationChannel"[],
    "audience_type" "AudienceType" NOT NULL,
    "audience_filter" JSONB,
    "recipient_count" INTEGER NOT NULL DEFAULT 0,
    "sent_count" INTEGER NOT NULL DEFAULT 0,
    "delivered_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduled_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "broadcast_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "broadcast_campaigns_tenant_id_idx" ON "broadcast_campaigns"("tenant_id");

-- CreateIndex
CREATE INDEX "broadcast_campaigns_tenant_id_status_idx" ON "broadcast_campaigns"("tenant_id", "status");

-- AddForeignKey
ALTER TABLE "broadcast_campaigns" ADD CONSTRAINT "broadcast_campaigns_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcast_campaigns" ADD CONSTRAINT "broadcast_campaigns_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "message_deliveries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "campaign_id" UUID,
    "recipient_id" UUID NOT NULL,
    "recipient_phone" VARCHAR(15),
    "recipient_email" VARCHAR(255),
    "channel" "NotificationChannel" NOT NULL,
    "event_type" VARCHAR(50),
    "message" TEXT NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'QUEUED',
    "provider_ref" VARCHAR(200),
    "error_message" VARCHAR(500),
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "message_deliveries_tenant_id_idx" ON "message_deliveries"("tenant_id");

-- CreateIndex
CREATE INDEX "message_deliveries_tenant_id_recipient_id_idx" ON "message_deliveries"("tenant_id", "recipient_id");

-- CreateIndex
CREATE INDEX "message_deliveries_tenant_id_event_type_idx" ON "message_deliveries"("tenant_id", "event_type");

-- CreateIndex
CREATE INDEX "message_deliveries_campaign_id_idx" ON "message_deliveries"("campaign_id");

-- CreateIndex
CREATE INDEX "message_deliveries_status_idx" ON "message_deliveries"("status");

-- AddForeignKey
ALTER TABLE "message_deliveries" ADD CONSTRAINT "message_deliveries_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "broadcast_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_preferences_tenant_id_idx" ON "notification_preferences"("tenant_id");

-- CreateIndex
CREATE INDEX "notification_preferences_user_id_idx" ON "notification_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_channel_event_type_key" ON "notification_preferences"("user_id", "channel", "event_type");

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "consent_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "consented" BOOLEAN NOT NULL DEFAULT true,
    "consented_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "ip_address" VARCHAR(45),

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consent_records_tenant_id_idx" ON "consent_records"("tenant_id");

-- CreateIndex
CREATE INDEX "consent_records_user_id_channel_idx" ON "consent_records"("user_id", "channel");

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
