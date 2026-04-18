-- CreateEnum
CREATE TYPE "ExportFormat" AS ENUM ('CSV', 'PDF');

-- CreateEnum
CREATE TYPE "ExportStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "dashboard_layouts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "layout" JSONB NOT NULL,
    "widgets" JSONB NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_layouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "snapshot_date" DATE NOT NULL,
    "total_sessions" INTEGER NOT NULL DEFAULT 0,
    "avg_attendance_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "absent_count" INTEGER NOT NULL DEFAULT 0,
    "late_count" INTEGER NOT NULL DEFAULT 0,
    "anomaly_count" INTEGER NOT NULL DEFAULT 0,
    "exams_published" INTEGER NOT NULL DEFAULT 0,
    "avg_exam_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "pass_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "pending_retests" INTEGER NOT NULL DEFAULT 0,
    "expected_revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "collected_revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "collection_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "overdue_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "overdue_count" INTEGER NOT NULL DEFAULT 0,
    "avg_engagement_score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "at_risk_count" INTEGER NOT NULL DEFAULT 0,
    "active_students" INTEGER NOT NULL DEFAULT 0,
    "total_students" INTEGER NOT NULL DEFAULT 0,
    "login_count" INTEGER NOT NULL DEFAULT 0,
    "materials_viewed" INTEGER NOT NULL DEFAULT 0,
    "videos_watched" INTEGER NOT NULL DEFAULT 0,
    "avg_video_completion" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "assignments_submitted" INTEGER NOT NULL DEFAULT 0,
    "assignments_missed" INTEGER NOT NULL DEFAULT 0,
    "messages_sent" INTEGER NOT NULL DEFAULT 0,
    "messages_delivered" INTEGER NOT NULL DEFAULT 0,
    "delivery_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "report_type" VARCHAR(50) NOT NULL,
    "format" "ExportFormat" NOT NULL,
    "status" "ExportStatus" NOT NULL DEFAULT 'QUEUED',
    "filters" JSONB,
    "file_key" VARCHAR(500),
    "file_name" VARCHAR(255),
    "file_size" INTEGER,
    "error_message" VARCHAR(500),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "export_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_batch_access" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "assignment_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assignment_batch_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_layouts_user_id_key" ON "dashboard_layouts"("user_id");
CREATE INDEX "dashboard_layouts_tenant_id_idx" ON "dashboard_layouts"("tenant_id");

-- CreateIndex
CREATE INDEX "analytics_snapshots_tenant_id_idx" ON "analytics_snapshots"("tenant_id");
CREATE INDEX "analytics_snapshots_tenant_id_snapshot_date_idx" ON "analytics_snapshots"("tenant_id", "snapshot_date");
CREATE UNIQUE INDEX "analytics_snapshots_tenant_id_snapshot_date_key" ON "analytics_snapshots"("tenant_id", "snapshot_date");

-- CreateIndex
CREATE INDEX "export_jobs_tenant_id_idx" ON "export_jobs"("tenant_id");
CREATE INDEX "export_jobs_user_id_idx" ON "export_jobs"("user_id");
CREATE INDEX "export_jobs_status_idx" ON "export_jobs"("status");

-- CreateIndex
CREATE INDEX "assignment_batch_access_tenant_id_idx" ON "assignment_batch_access"("tenant_id");
CREATE INDEX "assignment_batch_access_batch_id_idx" ON "assignment_batch_access"("batch_id");
CREATE UNIQUE INDEX "assignment_batch_access_assignment_id_batch_id_key" ON "assignment_batch_access"("assignment_id", "batch_id");

-- AddForeignKey
ALTER TABLE "dashboard_layouts" ADD CONSTRAINT "dashboard_layouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_snapshots" ADD CONSTRAINT "analytics_snapshots_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_batch_access" ADD CONSTRAINT "assignment_batch_access_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assignment_batch_access" ADD CONSTRAINT "assignment_batch_access_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- Enable RLS on new tables
ALTER TABLE "dashboard_layouts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dashboard_layouts" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "dashboard_layouts";
CREATE POLICY tenant_isolation ON "dashboard_layouts"
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

ALTER TABLE "analytics_snapshots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "analytics_snapshots" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "analytics_snapshots";
CREATE POLICY tenant_isolation ON "analytics_snapshots"
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

ALTER TABLE "export_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "export_jobs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "export_jobs";
CREATE POLICY tenant_isolation ON "export_jobs"
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

ALTER TABLE "assignment_batch_access" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assignment_batch_access" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "assignment_batch_access";
CREATE POLICY tenant_isolation ON "assignment_batch_access"
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
