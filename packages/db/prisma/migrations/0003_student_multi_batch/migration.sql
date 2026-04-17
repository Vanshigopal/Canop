-- CreateTable
CREATE TABLE "student_batches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),

    CONSTRAINT "student_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_batches_tenant_id_idx" ON "student_batches"("tenant_id");

-- CreateIndex
CREATE INDEX "student_batches_batch_id_idx" ON "student_batches"("batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_batches_student_id_batch_id_key" ON "student_batches"("student_id", "batch_id");

-- AddForeignKey
ALTER TABLE "student_batches" ADD CONSTRAINT "student_batches_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_batches" ADD CONSTRAINT "student_batches_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
