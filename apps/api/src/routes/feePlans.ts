import { prisma, withTenantTransaction } from "@/config/db";
import { emitToTenant } from "@/config/socket";
import { Errors } from "@/lib/errors";
import { generateInstallments } from "@/lib/fees";
import { created, noContent, ok } from "@/lib/response";
import { authenticate, requireRole } from "@/middleware/auth";
import { validate } from "@/middleware/validate";
import type { Prisma } from "@prisma/client";
import { AssignFeePlanSchema, CreateFeePlanSchema, UpdateFeePlanSchema } from "@raquel/types";
import { Router } from "express";

export const feePlansRouter = Router();

feePlansRouter.use(authenticate);

feePlansRouter.get("/", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { batchId, academicYear } = req.query as Record<string, string | undefined>;
  const where: Prisma.FeePlanWhereInput = { tenantId, deletedAt: null };
  if (batchId) where.batchId = batchId;
  if (academicYear) where.academicYear = academicYear;

  const data = await prisma.feePlan.findMany({
    where,
    include: {
      batch: { select: { id: true, name: true } },
      items: { include: { category: { select: { id: true, name: true } } } },
      _count: { select: { studentFees: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return ok(res, data);
});

feePlansRouter.post("/", requireRole("ADMIN"), validate(CreateFeePlanSchema), async (req, res) => {
  const tenantId = req.user!.tenantId;
  const body = req.body as import("@raquel/types").CreateFeePlan;

  const itemsSum = body.items.reduce((acc, it) => acc + it.amount, 0);
  if (Math.abs(itemsSum - body.totalAmount) > 0.01) {
    throw Errors.badRequest(
      `Fee item amounts (${itemsSum}) must equal total amount (${body.totalAmount})`,
    );
  }

  const batch = await prisma.batch.findFirst({
    where: { id: body.batchId, tenantId, deletedAt: null },
  });
  if (!batch) throw Errors.notFound("Batch");

  // Ensure all categories belong to tenant
  const cats = await prisma.feeCategory.findMany({
    where: { tenantId, id: { in: body.items.map((i) => i.categoryId) }, deletedAt: null },
  });
  if (cats.length !== body.items.length) {
    throw Errors.badRequest("One or more fee categories are invalid");
  }

  const plan = await withTenantTransaction(prisma, tenantId, (tx) =>
    tx.feePlan.create({
      data: {
        tenantId,
        batchId: body.batchId,
        name: body.name,
        academicYear: body.academicYear,
        totalAmount: body.totalAmount,
        installmentCount: body.installmentCount,
        installmentFrequency: body.installmentFrequency,
        dueDay: body.dueDay,
        lateFeeAmount: body.lateFeeAmount ?? null,
        lateFeePercent: body.lateFeePercent ?? null,
        gracePeriodDays: body.gracePeriodDays,
        gstPercent: body.gstPercent ?? null,
        items: {
          create: body.items.map((i) => ({ categoryId: i.categoryId, amount: i.amount })),
        },
      },
      include: {
        items: { include: { category: true } },
        batch: { select: { id: true, name: true } },
      },
    }),
  );

  emitToTenant(tenantId, "fee-plan:created", { id: plan.id, name: plan.name });
  return created(res, plan);
});

feePlansRouter.get("/:id", async (req, res) => {
  const id = req.params.id as string;
  const plan = await prisma.feePlan.findFirst({
    where: { id, tenantId: req.user!.tenantId, deletedAt: null },
    include: {
      batch: { select: { id: true, name: true, academicYear: true } },
      items: { include: { category: { select: { id: true, name: true } } } },
      studentFees: {
        include: {
          student: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
        },
      },
    },
  });
  if (!plan) throw Errors.notFound("Fee plan");
  return ok(res, plan);
});

feePlansRouter.patch(
  "/:id",
  requireRole("ADMIN"),
  validate(UpdateFeePlanSchema),
  async (req, res) => {
    const id = req.params.id as string;
    const plan = await prisma.feePlan.findFirst({
      where: { id, tenantId: req.user!.tenantId, deletedAt: null },
    });
    if (!plan) throw Errors.notFound("Fee plan");
    const updated = await withTenantTransaction(prisma, req.user!.tenantId, (tx) =>
      tx.feePlan.update({ where: { id }, data: req.body }),
    );
    return ok(res, updated);
  },
);

feePlansRouter.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  const id = req.params.id as string;
  const plan = await prisma.feePlan.findFirst({
    where: { id, tenantId: req.user!.tenantId, deletedAt: null },
  });
  if (!plan) throw Errors.notFound("Fee plan");
  await withTenantTransaction(prisma, req.user!.tenantId, (tx) =>
    tx.feePlan.update({ where: { id }, data: { deletedAt: new Date() } }),
  );
  return noContent(res);
});

feePlansRouter.post(
  "/:id/assign",
  requireRole("ADMIN", "TEACHER"),
  validate(AssignFeePlanSchema),
  async (req, res) => {
    const tenantId = req.user!.tenantId;
    const id = req.params.id as string;
    const body = req.body as import("@raquel/types").AssignFeePlan;

    const plan = await prisma.feePlan.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { batch: true },
    });
    if (!plan) throw Errors.notFound("Fee plan");

    const students = await prisma.student.findMany({
      where: { id: { in: body.studentIds }, tenantId, deletedAt: null },
    });
    if (students.length !== body.studentIds.length) {
      throw Errors.badRequest("One or more students are invalid");
    }

    // Compute discount once — same terms apply to each target student
    const discountAmount = body.discountAmount ?? 0;
    const totalAfterDiscount = Math.max(0, Number(plan.totalAmount) - discountAmount);

    // Schedule starts from batch.startDate if set, else today
    const startDate = plan.batch.startDate
      ? new Date(plan.batch.startDate)
      : new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));

    const schedule = generateInstallments(
      totalAfterDiscount,
      plan.installmentCount,
      plan.installmentFrequency,
      startDate,
      plan.dueDay,
    );

    const results: Array<{ studentId: string; studentFeeId: string }> = [];

    await withTenantTransaction(prisma, tenantId, async (tx) => {
      for (const student of students) {
        const existing = await tx.studentFee.findUnique({
          where: {
            tenantId_studentId_planId: { tenantId, studentId: student.id, planId: plan.id },
          },
        });

        if (existing) {
          // Idempotent update — only touch discount fields + recompute pending
          const newTotal = totalAfterDiscount;
          const newPending = Math.max(0, newTotal - Number(existing.paidAmount));
          const status =
            newPending === 0
              ? "PAID"
              : Number(existing.paidAmount) > 0
                ? "PARTIALLY_PAID"
                : "PENDING";
          await tx.studentFee.update({
            where: { id: existing.id },
            data: {
              totalAmount: newTotal,
              discountAmount,
              discountType: body.discountType ?? null,
              discountReason: body.discountReason ?? null,
              pendingAmount: newPending,
              status,
            },
          });
          results.push({ studentId: student.id, studentFeeId: existing.id });
          continue;
        }

        const sf = await tx.studentFee.create({
          data: {
            tenantId,
            studentId: student.id,
            planId: plan.id,
            totalAmount: totalAfterDiscount,
            discountAmount,
            discountType: body.discountType ?? null,
            discountReason: body.discountReason ?? null,
            paidAmount: 0,
            pendingAmount: totalAfterDiscount,
            status: "PENDING",
          },
        });
        await tx.installment.createMany({
          data: schedule.map((i) => ({
            tenantId,
            studentFeeId: sf.id,
            installmentNumber: i.installmentNumber,
            amount: i.amount,
            dueDate: i.dueDate,
            status: "UPCOMING" as const,
          })),
        });
        results.push({ studentId: student.id, studentFeeId: sf.id });
      }
    });

    emitToTenant(tenantId, "fee:assigned", {
      planId: plan.id,
      count: results.length,
    });
    return ok(res, { assigned: results.length, studentFees: results });
  },
);
