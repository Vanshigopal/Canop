-- ════════════════════════════════════════════════════════
-- PLATFORM ADMINISTRATION (not tenant-scoped — no RLS)
-- ════════════════════════════════════════════════════════

-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('SUPER_ADMIN', 'PLATFORM_SUPPORT', 'PLATFORM_BILLING');

CREATE TYPE "SubscriptionPlan" AS ENUM (
    'FREE_TRIAL', 'STARTER', 'GROWTH', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM'
);

CREATE TYPE "SubscriptionStatus" AS ENUM (
    'ACTIVE', 'TRIAL', 'PAST_DUE', 'SUSPENDED', 'CANCELLED', 'EXPIRED'
);

-- CreateTable: platform_admins
CREATE TABLE "platform_admins" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "PlatformRole" NOT NULL DEFAULT 'SUPER_ADMIN',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_admins_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "platform_admins_email_key" ON "platform_admins"("email");
CREATE INDEX "platform_admins_email_idx" ON "platform_admins"("email");

-- CreateTable: tenant_subscriptions
CREATE TABLE "tenant_subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE_TRIAL',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "max_students" INTEGER NOT NULL DEFAULT 50,
    "max_teachers" INTEGER NOT NULL DEFAULT 5,
    "max_batches" INTEGER NOT NULL DEFAULT 5,
    "max_storage_gb" INTEGER NOT NULL DEFAULT 5,
    "ai_enabled" BOOLEAN NOT NULL DEFAULT false,
    "omr_enabled" BOOLEAN NOT NULL DEFAULT false,
    "video_enabled" BOOLEAN NOT NULL DEFAULT false,
    "analytics_enabled" BOOLEAN NOT NULL DEFAULT true,
    "whatsapp_enabled" BOOLEAN NOT NULL DEFAULT false,
    "monthly_price_inr" DECIMAL(10, 2) NOT NULL DEFAULT 0,
    "billing_cycle_day" INTEGER NOT NULL DEFAULT 1,
    "trial_ends_at" TIMESTAMP(3),
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "current_student_count" INTEGER NOT NULL DEFAULT 0,
    "current_teacher_count" INTEGER NOT NULL DEFAULT 0,
    "current_storage_used_mb" DECIMAL(10, 2) NOT NULL DEFAULT 0,
    "total_paid_inr" DECIMAL(12, 2) NOT NULL DEFAULT 0,
    "last_payment_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_subscriptions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tenant_subscriptions_tenant_id_key" ON "tenant_subscriptions"("tenant_id");
CREATE INDEX "tenant_subscriptions_tenant_id_idx" ON "tenant_subscriptions"("tenant_id");
CREATE INDEX "tenant_subscriptions_status_idx" ON "tenant_subscriptions"("status");
CREATE INDEX "tenant_subscriptions_plan_idx" ON "tenant_subscriptions"("plan");
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable RLS on tenant_subscriptions (tenant-scoped)
ALTER TABLE "tenant_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_subscriptions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "tenant_subscriptions";
CREATE POLICY tenant_isolation ON "tenant_subscriptions"
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- CreateTable: platform_audit_logs
CREATE TABLE "platform_audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "admin_id" UUID NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "target_type" VARCHAR(50) NOT NULL,
    "target_id" UUID,
    "details" JSONB,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "platform_audit_logs_admin_id_idx" ON "platform_audit_logs"("admin_id");
CREATE INDEX "platform_audit_logs_action_idx" ON "platform_audit_logs"("action");
CREATE INDEX "platform_audit_logs_target_type_target_id_idx" ON "platform_audit_logs"("target_type", "target_id");
CREATE INDEX "platform_audit_logs_created_at_idx" ON "platform_audit_logs"("created_at");
ALTER TABLE "platform_audit_logs" ADD CONSTRAINT "platform_audit_logs_admin_id_fkey"
    FOREIGN KEY ("admin_id") REFERENCES "platform_admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: platform_revenue
CREATE TABLE "platform_revenue" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "month" VARCHAR(7) NOT NULL,
    "subscription_inr" DECIMAL(10, 2) NOT NULL DEFAULT 0,
    "ai_usage_inr" DECIMAL(10, 2) NOT NULL DEFAULT 0,
    "sms_usage_inr" DECIMAL(10, 2) NOT NULL DEFAULT 0,
    "storage_inr" DECIMAL(10, 2) NOT NULL DEFAULT 0,
    "total_inr" DECIMAL(10, 2) NOT NULL DEFAULT 0,
    "paid_at" TIMESTAMP(3),
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_revenue_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "platform_revenue_tenant_id_month_key" ON "platform_revenue"("tenant_id", "month");
CREATE INDEX "platform_revenue_month_idx" ON "platform_revenue"("month");
CREATE INDEX "platform_revenue_tenant_id_idx" ON "platform_revenue"("tenant_id");
ALTER TABLE "platform_revenue" ADD CONSTRAINT "platform_revenue_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
