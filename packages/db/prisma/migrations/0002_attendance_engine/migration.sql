-- CreateEnum
CREATE TYPE "AttendanceType" AS ENUM ('LECTURE', 'EXAM', 'RETEST');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');

-- CreateEnum
CREATE TYPE "AttendanceMethod" AS ENUM ('QR_SCAN', 'MANUAL', 'BULK');

-- CreateTable
CREATE TABLE "attendance_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "subject_id" UUID,
    "type" "AttendanceType" NOT NULL,
    "date" DATE NOT NULL,
    "start_time" VARCHAR(5),
    "end_time" VARCHAR(5),
    "marked_by_id" UUID NOT NULL,
    "qr_code" VARCHAR(64),
    "qr_expires_at" TIMESTAMP(3),
    "exam_id" UUID,
    "retest_id" UUID,
    "is_finalized" BOOLEAN NOT NULL DEFAULT false,
    "total_present" INTEGER NOT NULL DEFAULT 0,
    "total_absent" INTEGER NOT NULL DEFAULT 0,
    "total_late" INTEGER NOT NULL DEFAULT 0,
    "note" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'ABSENT',
    "method" "AttendanceMethod" NOT NULL DEFAULT 'MANUAL',
    "home_batch_id" UUID NOT NULL,
    "attended_batch_id" UUID NOT NULL,
    "is_guest_in_batch" BOOLEAN NOT NULL DEFAULT false,
    "marked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "marked_by_id" UUID,
    "device_info" VARCHAR(500),
    "ip_address" VARCHAR(45),
    "note" VARCHAR(300),
    "late_minutes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attendance_sessions_qr_code_key" ON "attendance_sessions"("qr_code");

-- CreateIndex
CREATE INDEX "attendance_sessions_tenant_id_idx" ON "attendance_sessions"("tenant_id");

-- CreateIndex
CREATE INDEX "attendance_sessions_tenant_id_batch_id_date_idx" ON "attendance_sessions"("tenant_id", "batch_id", "date");

-- CreateIndex
CREATE INDEX "attendance_sessions_tenant_id_date_idx" ON "attendance_sessions"("tenant_id", "date");

-- CreateIndex
CREATE INDEX "attendance_sessions_qr_code_idx" ON "attendance_sessions"("qr_code");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_sessions_tenant_id_batch_id_type_date_start_time_key" ON "attendance_sessions"("tenant_id", "batch_id", "type", "date", "start_time");

-- CreateIndex
CREATE INDEX "attendance_records_tenant_id_idx" ON "attendance_records"("tenant_id");

-- CreateIndex
CREATE INDEX "attendance_records_tenant_id_student_id_idx" ON "attendance_records"("tenant_id", "student_id");

-- CreateIndex
CREATE INDEX "attendance_records_tenant_id_student_id_status_idx" ON "attendance_records"("tenant_id", "student_id", "status");

-- CreateIndex
CREATE INDEX "attendance_records_session_id_idx" ON "attendance_records"("session_id");

-- CreateIndex
CREATE INDEX "attendance_records_home_batch_id_idx" ON "attendance_records"("home_batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_session_id_student_id_key" ON "attendance_records"("session_id", "student_id");

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_marked_by_id_fkey" FOREIGN KEY ("marked_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "attendance_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_marked_by_id_fkey" FOREIGN KEY ("marked_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
