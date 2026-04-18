-- CreateEnum
CREATE TYPE "ExamType" AS ENUM ('THEORY', 'MCQ', 'THEORY_MCQ', 'OBJECTIVE', 'NUMERICAL');

-- CreateEnum
CREATE TYPE "ExamStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'MARKS_ENTRY', 'UNDER_REVIEW', 'PUBLISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CutOffType" AS ENUM ('MARKS', 'PERCENTAGE');

-- CreateTable
CREATE TABLE "exams" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "subject_id" UUID,
    "name" VARCHAR(200) NOT NULL,
    "type" "ExamType" NOT NULL,
    "status" "ExamStatus" NOT NULL DEFAULT 'DRAFT',
    "description" VARCHAR(500),
    "total_marks" DECIMAL(8,2) NOT NULL,
    "passing_marks" DECIMAL(8,2),
    "passing_percent" DECIMAL(5,2),
    "cut_off_type" "CutOffType" NOT NULL DEFAULT 'PERCENTAGE',
    "total_questions" INTEGER,
    "marks_per_correct" DECIMAL(5,2),
    "marks_per_wrong" DECIMAL(5,2),
    "marks_per_unattempted" DECIMAL(5,2),
    "theory_max_marks" DECIMAL(8,2),
    "mcq_max_marks" DECIMAL(8,2),
    "mcq_question_count" INTEGER,
    "exam_date" DATE,
    "start_time" VARCHAR(5),
    "end_time" VARCHAR(5),
    "duration" INTEGER,
    "created_by_id" UUID NOT NULL,
    "published_at" TIMESTAMP(3),
    "published_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exams_tenant_id_idx" ON "exams"("tenant_id");

-- CreateIndex
CREATE INDEX "exams_tenant_id_batch_id_idx" ON "exams"("tenant_id", "batch_id");

-- CreateIndex
CREATE INDEX "exams_tenant_id_status_idx" ON "exams"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "exams_tenant_id_exam_date_idx" ON "exams"("tenant_id", "exam_date");

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_published_by_id_fkey" FOREIGN KEY ("published_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "mark_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "exam_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "marks_obtained" DECIMAL(8,2),
    "percentage" DECIMAL(5,2),
    "grade" VARCHAR(5),
    "batch_rank" INTEGER,
    "is_passed" BOOLEAN,
    "is_absent" BOOLEAN NOT NULL DEFAULT false,
    "theory_marks" DECIMAL(8,2),
    "mcq_correct" INTEGER,
    "mcq_incorrect" INTEGER,
    "mcq_unattempted" INTEGER,
    "mcq_positive_marks" DECIMAL(8,2),
    "mcq_negative_marks" DECIMAL(8,2),
    "mcq_net_marks" DECIMAL(8,2),
    "trend_direction" VARCHAR(10),
    "entered_by_id" UUID,
    "entered_at" TIMESTAMP(3),
    "modified_by_id" UUID,
    "modified_at" TIMESTAMP(3),
    "note" VARCHAR(300),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mark_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mark_entries_exam_id_student_id_key" ON "mark_entries"("exam_id", "student_id");

-- CreateIndex
CREATE INDEX "mark_entries_tenant_id_idx" ON "mark_entries"("tenant_id");

-- CreateIndex
CREATE INDEX "mark_entries_tenant_id_student_id_idx" ON "mark_entries"("tenant_id", "student_id");

-- CreateIndex
CREATE INDEX "mark_entries_exam_id_idx" ON "mark_entries"("exam_id");

-- AddForeignKey
ALTER TABLE "mark_entries" ADD CONSTRAINT "mark_entries_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mark_entries" ADD CONSTRAINT "mark_entries_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mark_entries" ADD CONSTRAINT "mark_entries_entered_by_id_fkey" FOREIGN KEY ("entered_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: link attendance_sessions.exam_id to exams
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Enable RLS on new tables
ALTER TABLE "exams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "exams" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "exams";
CREATE POLICY tenant_isolation ON "exams"
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

ALTER TABLE "mark_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mark_entries" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "mark_entries";
CREATE POLICY tenant_isolation ON "mark_entries"
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
