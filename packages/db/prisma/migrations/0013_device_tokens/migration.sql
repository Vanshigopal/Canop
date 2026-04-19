-- ════════════════════════════════════════════════════════
-- DEVICE TOKENS (FCM/APNS/Web Push)
-- Stores push notification tokens for mobile and web clients.
-- A user can have many tokens (one per device).
-- ════════════════════════════════════════════════════════

-- CreateTable
CREATE TABLE "device_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" VARCHAR(500) NOT NULL,
    "platform" VARCHAR(20) NOT NULL,
    "device_id" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "device_tokens_tenant_id_idx" ON "device_tokens"("tenant_id");
CREATE INDEX "device_tokens_user_id_idx" ON "device_tokens"("user_id");
CREATE UNIQUE INDEX "device_tokens_user_id_device_id_key" ON "device_tokens"("user_id", "device_id");

-- AddForeignKey
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Enable Row Level Security ────────────────────────────
ALTER TABLE "device_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "device_tokens" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "device_tokens";
CREATE POLICY tenant_isolation ON "device_tokens"
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
