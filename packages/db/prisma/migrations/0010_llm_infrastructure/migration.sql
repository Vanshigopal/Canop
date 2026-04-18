-- CreateEnum
CREATE TYPE "LLMMode" AS ENUM ('DISABLED', 'PLATFORM_KEY', 'BRING_YOUR_OWN_KEY');

-- CreateEnum
CREATE TYPE "LLMProviderName" AS ENUM ('ANTHROPIC_CLAUDE', 'OPENAI_GPT', 'LOCAL_LLAMA');

-- CreateEnum
CREATE TYPE "LLMRequestStatus" AS ENUM ('SUCCESS', 'STUBBED', 'FAILED_DISABLED', 'FAILED_CAP_REACHED', 'FAILED_INVALID_KEY', 'FAILED_RATE_LIMIT', 'FAILED_PROVIDER_ERROR', 'FAILED_TIMEOUT', 'FAILED_REDACTION');

-- CreateTable
CREATE TABLE "llm_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "mode" "LLMMode" NOT NULL DEFAULT 'DISABLED',
    "provider" "LLMProviderName" NOT NULL DEFAULT 'ANTHROPIC_CLAUDE',
    "encrypted_api_key" TEXT,
    "api_key_last_tested_at" TIMESTAMP(3),
    "api_key_last_test_status" VARCHAR(20),
    "preferred_model" VARCHAR(100) NOT NULL DEFAULT 'claude-3-5-sonnet-20241022',
    "share_student_names" BOOLEAN NOT NULL DEFAULT false,
    "share_parent_names" BOOLEAN NOT NULL DEFAULT false,
    "share_exam_marks" BOOLEAN NOT NULL DEFAULT true,
    "share_attendance_data" BOOLEAN NOT NULL DEFAULT true,
    "share_contact_info" BOOLEAN NOT NULL DEFAULT false,
    "enable_ai_chatbot" BOOLEAN NOT NULL DEFAULT false,
    "enable_ai_reports" BOOLEAN NOT NULL DEFAULT false,
    "enable_ai_translation" BOOLEAN NOT NULL DEFAULT false,
    "enable_ai_question_gen" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "llm_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "llm_request_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "config_id" UUID NOT NULL,
    "user_id" UUID,
    "feature_key" VARCHAR(50) NOT NULL,
    "provider" "LLMProviderName" NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "total_tokens" INTEGER NOT NULL DEFAULT 0,
    "estimated_cost_cents" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "status" "LLMRequestStatus" NOT NULL,
    "error_code" VARCHAR(50),
    "error_message" VARCHAR(500),
    "duration_ms" INTEGER NOT NULL DEFAULT 0,
    "prompt_hash" VARCHAR(64),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "llm_request_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "llm_spend_caps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "config_id" UUID NOT NULL,
    "monthly_cap_cents" DECIMAL(12,2) NOT NULL,
    "alerted_at_50" TIMESTAMP(3),
    "alerted_at_80" TIMESTAMP(3),
    "alerted_at_100" TIMESTAMP(3),
    "current_month_cents" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "current_month" VARCHAR(7) NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "llm_spend_caps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "llm_configs_tenant_id_key" ON "llm_configs"("tenant_id");

-- CreateIndex
CREATE INDEX "llm_configs_tenant_id_idx" ON "llm_configs"("tenant_id");

-- CreateIndex
CREATE INDEX "llm_request_logs_tenant_id_idx" ON "llm_request_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "llm_request_logs_tenant_id_feature_key_idx" ON "llm_request_logs"("tenant_id", "feature_key");

-- CreateIndex
CREATE INDEX "llm_request_logs_tenant_id_created_at_idx" ON "llm_request_logs"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "llm_request_logs_status_idx" ON "llm_request_logs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "llm_spend_caps_tenant_id_key" ON "llm_spend_caps"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "llm_spend_caps_config_id_key" ON "llm_spend_caps"("config_id");

-- CreateIndex
CREATE INDEX "llm_spend_caps_tenant_id_idx" ON "llm_spend_caps"("tenant_id");

-- AddForeignKey
ALTER TABLE "llm_configs" ADD CONSTRAINT "llm_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llm_request_logs" ADD CONSTRAINT "llm_request_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llm_request_logs" ADD CONSTRAINT "llm_request_logs_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "llm_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llm_request_logs" ADD CONSTRAINT "llm_request_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llm_spend_caps" ADD CONSTRAINT "llm_spend_caps_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llm_spend_caps" ADD CONSTRAINT "llm_spend_caps_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "llm_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
