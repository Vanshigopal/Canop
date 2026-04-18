-- CreateTable
CREATE TABLE "omr_scan_results" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "exam_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "mark_entry_id" UUID,
    "responses" JSONB NOT NULL,
    "scanned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scanned_by_id" UUID NOT NULL,

    CONSTRAINT "omr_scan_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "omr_scan_results_exam_id_student_id_key" ON "omr_scan_results"("exam_id", "student_id");

-- CreateIndex
CREATE INDEX "omr_scan_results_tenant_id_idx" ON "omr_scan_results"("tenant_id");

-- CreateIndex
CREATE INDEX "omr_scan_results_exam_id_idx" ON "omr_scan_results"("exam_id");

-- AddForeignKey
ALTER TABLE "omr_scan_results" ADD CONSTRAINT "omr_scan_results_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "omr_scan_results" ADD CONSTRAINT "omr_scan_results_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "omr_scan_results" ADD CONSTRAINT "omr_scan_results_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "omr_scan_results" ADD CONSTRAINT "omr_scan_results_scanned_by_id_fkey" FOREIGN KEY ("scanned_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Enable RLS
ALTER TABLE "omr_scan_results" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "omr_scan_results" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "omr_scan_results";
CREATE POLICY tenant_isolation ON "omr_scan_results"
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
