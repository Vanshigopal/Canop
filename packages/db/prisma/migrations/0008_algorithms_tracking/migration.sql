-- CreateTable
CREATE TABLE "recent_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "entity_type" VARCHAR(30) NOT NULL,
    "entity_id" UUID NOT NULL,
    "view_count" INTEGER NOT NULL DEFAULT 1,
    "last_viewed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recent_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recent_items_user_id_entity_type_entity_id_key" ON "recent_items"("user_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "recent_items_tenant_id_idx" ON "recent_items"("tenant_id");

-- CreateIndex
CREATE INDEX "recent_items_user_id_entity_type_last_viewed_idx" ON "recent_items"("user_id", "entity_type", "last_viewed");

-- AddForeignKey
ALTER TABLE "recent_items" ADD CONSTRAINT "recent_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recent_items" ADD CONSTRAINT "recent_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "message_dedup_keys" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "hash_key" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_dedup_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "message_dedup_keys_hash_key_key" ON "message_dedup_keys"("hash_key");

-- CreateIndex
CREATE INDEX "message_dedup_keys_tenant_id_idx" ON "message_dedup_keys"("tenant_id");

-- CreateIndex
CREATE INDEX "message_dedup_keys_expires_at_idx" ON "message_dedup_keys"("expires_at");

-- CreateTable
CREATE TABLE "engagement_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "score" DECIMAL(5,2) NOT NULL,
    "attendance_score" DECIMAL(5,2) NOT NULL,
    "marks_score" DECIMAL(5,2) NOT NULL,
    "assignment_score" DECIMAL(5,2) NOT NULL,
    "video_score" DECIMAL(5,2) NOT NULL,
    "login_score" DECIMAL(5,2) NOT NULL,
    "riskFactors" JSONB NOT NULL,
    "snapshot_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "engagement_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "engagement_snapshots_student_id_snapshot_date_key" ON "engagement_snapshots"("student_id", "snapshot_date");

-- CreateIndex
CREATE INDEX "engagement_snapshots_tenant_id_idx" ON "engagement_snapshots"("tenant_id");

-- CreateIndex
CREATE INDEX "engagement_snapshots_tenant_id_snapshot_date_idx" ON "engagement_snapshots"("tenant_id", "snapshot_date");

-- CreateIndex
CREATE INDEX "engagement_snapshots_tenant_id_score_idx" ON "engagement_snapshots"("tenant_id", "score");

-- AddForeignKey
ALTER TABLE "engagement_snapshots" ADD CONSTRAINT "engagement_snapshots_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engagement_snapshots" ADD CONSTRAINT "engagement_snapshots_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable RLS on new tables
ALTER TABLE "recent_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "recent_items" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "recent_items";
CREATE POLICY tenant_isolation ON "recent_items"
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

ALTER TABLE "message_dedup_keys" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "message_dedup_keys" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "message_dedup_keys";
CREATE POLICY tenant_isolation ON "message_dedup_keys"
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

ALTER TABLE "engagement_snapshots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "engagement_snapshots" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "engagement_snapshots";
CREATE POLICY tenant_isolation ON "engagement_snapshots"
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
