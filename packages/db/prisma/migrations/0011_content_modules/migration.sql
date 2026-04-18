-- CreateEnum
CREATE TYPE "ContentAccessType" AS ENUM ('BATCH', 'SUBJECT', 'INSTITUTE');

-- CreateEnum
CREATE TYPE "MaterialType" AS ENUM ('PDF', 'DOCX', 'PPT', 'IMAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "MaterialAction" AS ENUM ('VIEWED', 'DOWNLOADED');

-- CreateEnum
CREATE TYPE "VideoStatus" AS ENUM ('UPLOADING', 'TRANSCODING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('NOT_OPENED', 'OPENED', 'IN_PROGRESS', 'SUBMITTED', 'LATE_SUBMITTED', 'GRADED', 'MISSED');

-- CreateTable
CREATE TABLE "study_materials" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(1000),
    "material_type" "MaterialType" NOT NULL,
    "file_key" VARCHAR(500) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "subject_id" UUID,
    "chapter_number" INTEGER,
    "chapter_title" VARCHAR(200),
    "access_type" "ContentAccessType" NOT NULL DEFAULT 'BATCH',
    "uploaded_by_id" UUID NOT NULL,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMP(3),
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "study_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_batch_access" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "material_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_batch_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_access_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "material_id" UUID NOT NULL,
    "student_id" UUID,
    "user_id" UUID NOT NULL,
    "action" "MaterialAction" NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_lectures" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(1000),
    "bunny_video_id" VARCHAR(100),
    "bunny_library_id" VARCHAR(100),
    "thumbnail_url" VARCHAR(500),
    "playback_url" VARCHAR(500),
    "duration_sec" INTEGER,
    "status" "VideoStatus" NOT NULL DEFAULT 'UPLOADING',
    "subject_id" UUID,
    "chapter_number" INTEGER,
    "chapter_title" VARCHAR(200),
    "access_type" "ContentAccessType" NOT NULL DEFAULT 'BATCH',
    "uploaded_by_id" UUID NOT NULL,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "total_watch_time_sec" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMP(3),
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "video_lectures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_batch_access" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "video_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_batch_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_watch_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "video_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_heartbeat_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "furthest_position_sec" INTEGER NOT NULL DEFAULT 0,
    "total_watched_sec" INTEGER NOT NULL DEFAULT 0,
    "completion_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "device_type" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_watch_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "instructions" TEXT,
    "batch_id" UUID NOT NULL,
    "subject_id" UUID,
    "published_at" TIMESTAMP(3),
    "deadline" TIMESTAMP(3) NOT NULL,
    "allow_late_submission" BOOLEAN NOT NULL DEFAULT true,
    "late_deadline" TIMESTAMP(3),
    "total_marks" DECIMAL(6,2) NOT NULL,
    "late_penalty_percent" DECIMAL(5,2),
    "status" "AssignmentStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "assignment_id" UUID NOT NULL,
    "file_key" VARCHAR(500) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assignment_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_submissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "assignment_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "opened_at" TIMESTAMP(3),
    "first_upload_at" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3),
    "status" "SubmissionStatus" NOT NULL DEFAULT 'NOT_OPENED',
    "is_late" BOOLEAN NOT NULL DEFAULT false,
    "marks_awarded" DECIMAL(6,2),
    "feedback" TEXT,
    "graded_by_id" UUID,
    "graded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignment_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "file_key" VARCHAR(500) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "study_materials_tenant_id_idx" ON "study_materials"("tenant_id");
CREATE INDEX "study_materials_tenant_id_subject_id_idx" ON "study_materials"("tenant_id", "subject_id");
CREATE INDEX "study_materials_tenant_id_is_published_idx" ON "study_materials"("tenant_id", "is_published");

CREATE INDEX "material_batch_access_tenant_id_idx" ON "material_batch_access"("tenant_id");
CREATE INDEX "material_batch_access_batch_id_idx" ON "material_batch_access"("batch_id");
CREATE UNIQUE INDEX "material_batch_access_material_id_batch_id_key" ON "material_batch_access"("material_id", "batch_id");

CREATE INDEX "material_access_logs_tenant_id_idx" ON "material_access_logs"("tenant_id");
CREATE INDEX "material_access_logs_student_id_created_at_idx" ON "material_access_logs"("student_id", "created_at");
CREATE INDEX "material_access_logs_material_id_idx" ON "material_access_logs"("material_id");

CREATE INDEX "video_lectures_tenant_id_idx" ON "video_lectures"("tenant_id");
CREATE INDEX "video_lectures_tenant_id_subject_id_idx" ON "video_lectures"("tenant_id", "subject_id");
CREATE INDEX "video_lectures_tenant_id_is_published_idx" ON "video_lectures"("tenant_id", "is_published");

CREATE INDEX "video_batch_access_tenant_id_idx" ON "video_batch_access"("tenant_id");
CREATE INDEX "video_batch_access_batch_id_idx" ON "video_batch_access"("batch_id");
CREATE UNIQUE INDEX "video_batch_access_video_id_batch_id_key" ON "video_batch_access"("video_id", "batch_id");

CREATE INDEX "video_watch_sessions_tenant_id_idx" ON "video_watch_sessions"("tenant_id");
CREATE INDEX "video_watch_sessions_video_id_student_id_idx" ON "video_watch_sessions"("video_id", "student_id");
CREATE INDEX "video_watch_sessions_student_id_updated_at_idx" ON "video_watch_sessions"("student_id", "updated_at");
CREATE UNIQUE INDEX "video_watch_sessions_video_id_student_id_key" ON "video_watch_sessions"("video_id", "student_id");

CREATE INDEX "assignments_tenant_id_idx" ON "assignments"("tenant_id");
CREATE INDEX "assignments_tenant_id_batch_id_idx" ON "assignments"("tenant_id", "batch_id");
CREATE INDEX "assignments_tenant_id_status_idx" ON "assignments"("tenant_id", "status");
CREATE INDEX "assignments_tenant_id_deadline_idx" ON "assignments"("tenant_id", "deadline");

CREATE INDEX "assignment_attachments_tenant_id_idx" ON "assignment_attachments"("tenant_id");
CREATE INDEX "assignment_attachments_assignment_id_idx" ON "assignment_attachments"("assignment_id");

CREATE INDEX "assignment_submissions_tenant_id_idx" ON "assignment_submissions"("tenant_id");
CREATE INDEX "assignment_submissions_assignment_id_idx" ON "assignment_submissions"("assignment_id");
CREATE INDEX "assignment_submissions_student_id_idx" ON "assignment_submissions"("student_id");
CREATE INDEX "assignment_submissions_status_idx" ON "assignment_submissions"("status");
CREATE UNIQUE INDEX "assignment_submissions_assignment_id_student_id_key" ON "assignment_submissions"("assignment_id", "student_id");

CREATE INDEX "submission_files_tenant_id_idx" ON "submission_files"("tenant_id");
CREATE INDEX "submission_files_submission_id_idx" ON "submission_files"("submission_id");

-- AddForeignKey
ALTER TABLE "study_materials" ADD CONSTRAINT "study_materials_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "study_materials" ADD CONSTRAINT "study_materials_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "study_materials" ADD CONSTRAINT "study_materials_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "material_batch_access" ADD CONSTRAINT "material_batch_access_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "material_batch_access" ADD CONSTRAINT "material_batch_access_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "study_materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "material_batch_access" ADD CONSTRAINT "material_batch_access_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "material_access_logs" ADD CONSTRAINT "material_access_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "material_access_logs" ADD CONSTRAINT "material_access_logs_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "study_materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "material_access_logs" ADD CONSTRAINT "material_access_logs_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "material_access_logs" ADD CONSTRAINT "material_access_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "video_lectures" ADD CONSTRAINT "video_lectures_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "video_lectures" ADD CONSTRAINT "video_lectures_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "video_lectures" ADD CONSTRAINT "video_lectures_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "video_batch_access" ADD CONSTRAINT "video_batch_access_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "video_batch_access" ADD CONSTRAINT "video_batch_access_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "video_lectures"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "video_batch_access" ADD CONSTRAINT "video_batch_access_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "video_watch_sessions" ADD CONSTRAINT "video_watch_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "video_watch_sessions" ADD CONSTRAINT "video_watch_sessions_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "video_lectures"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "video_watch_sessions" ADD CONSTRAINT "video_watch_sessions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "video_watch_sessions" ADD CONSTRAINT "video_watch_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "assignments" ADD CONSTRAINT "assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "assignment_attachments" ADD CONSTRAINT "assignment_attachments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assignment_attachments" ADD CONSTRAINT "assignment_attachments_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_graded_by_id_fkey" FOREIGN KEY ("graded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "submission_files" ADD CONSTRAINT "submission_files_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "submission_files" ADD CONSTRAINT "submission_files_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "assignment_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable RLS on all content module tables
ALTER TABLE "study_materials" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "study_materials" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "study_materials";
CREATE POLICY tenant_isolation ON "study_materials"
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

ALTER TABLE "material_batch_access" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "material_batch_access" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "material_batch_access";
CREATE POLICY tenant_isolation ON "material_batch_access"
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

ALTER TABLE "material_access_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "material_access_logs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "material_access_logs";
CREATE POLICY tenant_isolation ON "material_access_logs"
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

ALTER TABLE "video_lectures" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "video_lectures" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "video_lectures";
CREATE POLICY tenant_isolation ON "video_lectures"
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

ALTER TABLE "video_batch_access" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "video_batch_access" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "video_batch_access";
CREATE POLICY tenant_isolation ON "video_batch_access"
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

ALTER TABLE "video_watch_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "video_watch_sessions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "video_watch_sessions";
CREATE POLICY tenant_isolation ON "video_watch_sessions"
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

ALTER TABLE "assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assignments" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "assignments";
CREATE POLICY tenant_isolation ON "assignments"
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

ALTER TABLE "assignment_attachments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assignment_attachments" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "assignment_attachments";
CREATE POLICY tenant_isolation ON "assignment_attachments"
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

ALTER TABLE "assignment_submissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assignment_submissions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "assignment_submissions";
CREATE POLICY tenant_isolation ON "assignment_submissions"
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

ALTER TABLE "submission_files" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "submission_files" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "submission_files";
CREATE POLICY tenant_isolation ON "submission_files"
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
