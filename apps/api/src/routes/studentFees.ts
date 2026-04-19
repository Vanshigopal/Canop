import { prisma, withTenantTransaction } from "@/config/db";
import { emitToTenant } from "@/config/socket";
import { Errors } from "@/lib/errors";
import { ok } from "@/lib/response";
import { authenticate, requireRole } from "@/middleware/auth";
import { validate } from "@/middleware/validate";
import type { Prisma } from "@prisma/client";
import { ApplyDiscountSchema, WaiveFeeSchema } from "@canop/types";
import { Router } from "express";

export const studentFeesRouter = Router();

studentFeesRouter.use(authenticate);

studentFeesRouter.get("/", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { batchId, status, overdue } = req.query as Record<string, string | undefined>;

  const where: Prisma.StudentFeeWhereInput = { tenantId };
  if (status) where.status = status as Prisma.StudentFeeWhereInput["status"];
  if (batchId) where.plan = { batchId };
  if (overdue === "true") {
    where.installments = { some: { status: "OVERDUE" } };
  }

  const data = await prisma.studentFee.findMany({
    where,
    include: {
      student: {
        select: {
          id: true,
          rollNumber: true,
          batch: { select: { id: true, name: true } },
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
      },
      plan: { select: { id: true, name: true, academicYear: true, totalAmount: true } },
      _count: { select: { payments: true, installments: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return ok(res, data);
});

// GET /student-fees/:studentId — all fees for that student with installments + payments
studentFeesRouter.get("/:studentId", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const studentId = req.params.studentId as string;

  const authUser = req.user!;
  if (authUser.role === "STUDENT" || authUser.role === "PARENT") {
    const student = await prisma.student.findFirst({ where: { id: studentId, tenantId } });
    if (!student) throw Errors.notFound("Student");
    if (authUser.role === "STUDENT" && student.userId !== authUser.id) {
      throw Errors.forbidden();
    }
    if (authUser.role === "PARENT") {
      const guardian = await prisma.guardian.findFirst({
        where: { studentId: student.id, userId: authUser.id, tenantId },
      });
      if (!guardian) throw Errors.forbidden();
    }
  }

  const fees = await prisma.studentFee.findMany({
    where: { tenantId, studentId },
    include: {
      plan: {
        include: {
          batch: { select: { id: true, name: true } },
          items: { include: { category: { select: { id: true, name: true } } } },
        },
      },
      installments: { orderBy: { installmentNumber: "asc" } },
      payments: {
        orderBy: { createdAt: "desc" },
        include: { collectedBy: { select: { id: true, name: true } } },
      },
    },
  });
  return ok(res, fees);
});

studentFeesRouter.patch(
  "/:id/discount",
  requireRole("ADMIN", "TEACHER"),
  validate(ApplyDiscountSchema),
  async (req, res) => {
    const tenantId = req.user!.tenantId;
    const id = req.params.id as string;
    const body = req.body as import("@canop/types").ApplyDiscount;

    const fee = await prisma.studentFee.findFirst({
      where: { id, tenantId },
      include: { plan: true },
    });
    if (!fee) throw Errors.notFound("Student fee");

    const newTotal = Math.max(0, Number(fee.plan.totalAmount) - body.discountAmount);
    const newPending = Math.max(0, newTotal - Number(fee.paidAmount));
    const newStatus =
      newPending === 0 ? "PAID" : Number(fee.paidAmount) > 0 ? "PARTIALLY_PAID" : "PENDING";

    const updated = await withTenantTransaction(prisma, tenantId, (tx) =>
      tx.studentFee.update({
        where: { id },
        data: {
          totalAmount: newTotal,
          discountAmount: body.discountAmount,
          discountType: body.discountType,
          discountReason: body.discountReason ?? null,
          pendingAmount: newPending,
          status: newStatus,
        },
      }),
    );
    emitToTenant(tenantId, "fee:discount-applied", { studentFeeId: id });
    return ok(res, updated);
  },
);

studentFeesRouter.post(
  "/:id/waive",
  requireRole("ADMIN"),
  validate(WaiveFeeSchema),
  async (req, res) => {
    const tenantId = req.user!.tenantId;
    const id = req.params.id as string;

    const fee = await prisma.studentFee.findFirst({ where: { id, tenantId } });
    if (!fee) throw Errors.notFound("Student fee");

    const updated = await withTenantTransaction(prisma, tenantId, async (tx) => {
      await tx.installment.updateMany({
        where: { studentFeeId: id, status: { in: ["UPCOMING", "DUE", "OVERDUE"] } },
        data: { status: "PAID" },
      });
      return tx.studentFee.update({
        where: { id },
        data: {
          status: "WAIVED",
          pendingAmount: 0,
          discountReason: req.body.reason,
        },
      });
    });
    emitToTenant(tenantId, "fee:waived", { studentFeeId: id });
    return ok(res, updated);
  },
);
