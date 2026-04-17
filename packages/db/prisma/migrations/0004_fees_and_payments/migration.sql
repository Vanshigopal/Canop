-- CreateEnum
CREATE TYPE "InstallmentFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'ANNUALLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "FeeStatus" AS ENUM ('PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'WAIVED');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FLAT', 'SCHOLARSHIP', 'SIBLING', 'MERIT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "InstallmentStatus" AS ENUM ('UPCOMING', 'DUE', 'OVERDUE', 'PAID', 'PARTIALLY_PAID');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'UPI', 'CARD', 'NETBANKING', 'CHEQUE', 'RAZORPAY_ONLINE', 'BANK_TRANSFER', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');

-- CreateTable
CREATE TABLE "fee_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(300),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "fee_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "academic_year" VARCHAR(9) NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "installment_count" INTEGER NOT NULL DEFAULT 1,
    "installment_frequency" "InstallmentFrequency" NOT NULL DEFAULT 'MONTHLY',
    "due_day" INTEGER NOT NULL DEFAULT 1,
    "late_fee_amount" DECIMAL(10,2),
    "late_fee_percent" DECIMAL(5,2),
    "grace_period_days" INTEGER NOT NULL DEFAULT 7,
    "gst_percent" DECIMAL(5,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "fee_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_plan_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "plan_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "fee_plan_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_fees" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discount_reason" VARCHAR(300),
    "discount_type" "DiscountType",
    "paid_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "pending_amount" DECIMAL(10,2) NOT NULL,
    "status" "FeeStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_fees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "installments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "student_fee_id" UUID NOT NULL,
    "installment_number" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "due_date" DATE NOT NULL,
    "paid_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "late_fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "InstallmentStatus" NOT NULL DEFAULT 'UPCOMING',
    "paid_at" TIMESTAMP(3),
    "reminder_sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "installments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "student_fee_id" UUID NOT NULL,
    "installment_id" UUID,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "razorpay_order_id" VARCHAR(100),
    "razorpay_payment_id" VARCHAR(100),
    "razorpay_signature" VARCHAR(200),
    "receipt_number" VARCHAR(50),
    "transaction_ref" VARCHAR(100),
    "collected_by_id" UUID,
    "note" VARCHAR(500),
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fee_categories_tenant_id_idx" ON "fee_categories"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "fee_categories_tenant_id_name_key" ON "fee_categories"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "fee_plans_tenant_id_idx" ON "fee_plans"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "fee_plans_tenant_id_batch_id_academic_year_key" ON "fee_plans"("tenant_id", "batch_id", "academic_year");

-- CreateIndex
CREATE UNIQUE INDEX "fee_plan_items_plan_id_category_id_key" ON "fee_plan_items"("plan_id", "category_id");

-- CreateIndex
CREATE INDEX "student_fees_tenant_id_idx" ON "student_fees"("tenant_id");

-- CreateIndex
CREATE INDEX "student_fees_tenant_id_student_id_idx" ON "student_fees"("tenant_id", "student_id");

-- CreateIndex
CREATE INDEX "student_fees_tenant_id_status_idx" ON "student_fees"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "student_fees_tenant_id_student_id_plan_id_key" ON "student_fees"("tenant_id", "student_id", "plan_id");

-- CreateIndex
CREATE INDEX "installments_tenant_id_idx" ON "installments"("tenant_id");

-- CreateIndex
CREATE INDEX "installments_tenant_id_due_date_idx" ON "installments"("tenant_id", "due_date");

-- CreateIndex
CREATE INDEX "installments_tenant_id_status_idx" ON "installments"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "installments_student_fee_id_installment_number_key" ON "installments"("student_fee_id", "installment_number");

-- CreateIndex
CREATE UNIQUE INDEX "payments_razorpay_order_id_key" ON "payments"("razorpay_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_razorpay_payment_id_key" ON "payments"("razorpay_payment_id");

-- CreateIndex
CREATE INDEX "payments_tenant_id_idx" ON "payments"("tenant_id");

-- CreateIndex
CREATE INDEX "payments_tenant_id_status_idx" ON "payments"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "payments_razorpay_order_id_idx" ON "payments"("razorpay_order_id");

-- AddForeignKey
ALTER TABLE "fee_categories" ADD CONSTRAINT "fee_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_plans" ADD CONSTRAINT "fee_plans_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_plans" ADD CONSTRAINT "fee_plans_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_plan_items" ADD CONSTRAINT "fee_plan_items_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "fee_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_plan_items" ADD CONSTRAINT "fee_plan_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "fee_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_fees" ADD CONSTRAINT "student_fees_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_fees" ADD CONSTRAINT "student_fees_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_fees" ADD CONSTRAINT "student_fees_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "fee_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installments" ADD CONSTRAINT "installments_student_fee_id_fkey" FOREIGN KEY ("student_fee_id") REFERENCES "student_fees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_student_fee_id_fkey" FOREIGN KEY ("student_fee_id") REFERENCES "student_fees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_installment_id_fkey" FOREIGN KEY ("installment_id") REFERENCES "installments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_collected_by_id_fkey" FOREIGN KEY ("collected_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
