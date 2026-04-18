-- CreateEnum
CREATE TYPE "RetestStatus" AS ENUM ('PENDING_SCHEDULE', 'SCHEDULED', 'COMPLETED', 'NO_SHOW', 'CANCELLED');

-- CreateTable
CREATE TABLE "retests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "exam_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "original_marks" DECIMAL(8,2) NOT NULL,
    "original_percentage" DECIMAL(5,2) NOT NULL,
    "cut_off" DECIMAL(8,2) NOT NULL,
    "cut_off_type" "CutOffType" NOT NULL,
    "scheduled_date" DATE,
    "scheduled_time" VARCHAR(5),
    "confirmed_by_id" UUID,
    "confirmed_at" TIMESTAMP(3),
    "retest_marks" DECIMAL(8,2),
    "retest_percentage" DECIMAL(5,2),
    "retest_is_passed" BOOLEAN,
    "retest_mcq_correct" INTEGER,
    "retest_mcq_incorrect" INTEGER,
    "retest_mcq_unattempted" INTEGER,
    "retest_theory_marks" DECIMAL(8,2),
    "attended_at" TIMESTAMP(3),
    "status" "RetestStatus" NOT NULL DEFAULT 'PENDING_SCHEDULE',
    "no_show_notified_at" TIMESTAMP(3),
    "attendance_record_id" UUID,
    "entered_by_id" UUID,
    "note" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "retests_exam_id_student_id_key" ON "retests"("exam_id", "student_id");

-- CreateIndex
CREATE INDEX "retests_tenant_id_idx" ON "retests"("tenant_id");

-- CreateIndex
CREATE INDEX "retests_tenant_id_status_idx" ON "retests"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "retests_tenant_id_scheduled_date_idx" ON "retests"("tenant_id", "scheduled_date");

-- AddForeignKey
ALTER TABLE "retests" ADD CONSTRAINT "retests_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retests" ADD CONSTRAINT "retests_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retests" ADD CONSTRAINT "retests_confirmed_by_id_fkey" FOREIGN KEY ("confirmed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retests" ADD CONSTRAINT "retests_entered_by_id_fkey" FOREIGN KEY ("entered_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Enable RLS on new table
ALTER TABLE "retests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "retests" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "retests";
CREATE POLICY tenant_isolation ON "retests"
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
