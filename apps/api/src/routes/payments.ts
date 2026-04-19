import crypto from "node:crypto";
import { prisma, withTenantTransaction } from "@/config/db";
import { env } from "@/config/env";
import { emitToTenant } from "@/config/socket";
import { Errors } from "@/lib/errors";
import { buildReceiptNumber, computeLateFee } from "@/lib/fees";
import { ok, paginated } from "@/lib/response";
import { authenticate, requireRole } from "@/middleware/auth";
import { validate } from "@/middleware/validate";
import { notifySafe } from "@/services/notification.service";
import type { Prisma } from "@prisma/client";
import { RazorpayOrderSchema, RazorpayVerifySchema, RecordPaymentSchema } from "@canop/types";
import { Router } from "express";
import Razorpay from "razorpay";

export const paymentsRouter = Router();

paymentsRouter.use(authenticate);

const razorpayClient =
  env.RAZORPAY_KEY_ID.startsWith("rzp_") && env.RAZORPAY_KEY_SECRET.length > 10
    ? new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET })
    : null;

async function notifyPaymentReceived(
  tenantId: string,
  paymentId: string,
  tenantName: string,
): Promise<void> {
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, tenantId },
    include: {
      studentFee: {
        include: {
          student: {
            include: {
              user: { select: { name: true } },
              guardians: { where: { userId: { not: null } }, orderBy: { isEmergency: "desc" } },
            },
          },
        },
      },
      installment: true,
    },
  });
  if (!payment) return;

  const studentName = payment.studentFee.student.user.name;
  const formatAmount = (n: number) => new Intl.NumberFormat("en-IN").format(n);
  const today = new Date();
  const base: Record<string, string> = {
    student_name: studentName,
    fee_amount: formatAmount(Number(payment.amount)),
    fee_paid: formatAmount(Number(payment.amount)),
    receipt_number: payment.receiptNumber ?? "",
    fee_pending: formatAmount(Number(payment.studentFee.pendingAmount)),
    installment_number: payment.installment?.installmentNumber.toString() ?? "",
    institute_name: tenantName,
    date: today.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
  };

  for (const g of payment.studentFee.student.guardians) {
    if (!g.userId) continue;
    await notifySafe({
      tenantId,
      eventType: "fee_paid",
      recipientUserId: g.userId,
      context: { ...base, parent_name: g.name, parent_phone: g.phone },
    });
  }
}

async function nextReceiptNumber(
  tx: Prisma.TransactionClient,
  tenantId: string,
  slug: string,
): Promise<string> {
  const now = new Date();
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const endOfDay = new Date(startOfDay.getTime() + 86400000);
  const todayCount = await tx.payment.count({
    where: {
      tenantId,
      createdAt: { gte: startOfDay, lt: endOfDay },
      receiptNumber: { not: null },
    },
  });
  return buildReceiptNumber({ tenantSlug: slug, date: now, sequence: todayCount + 1 });
}

async function applyPaymentAmount(
  tx: Prisma.TransactionClient,
  params: {
    tenantId: string;
    studentFeeId: string;
    installmentId?: string | null;
    amount: number;
  },
) {
  const { tenantId, studentFeeId, installmentId, amount } = params;

  const fee = await tx.studentFee.findFirst({
    where: { id: studentFeeId, tenantId },
    include: { plan: true },
  });
  if (!fee) throw Errors.notFound("Student fee");

  if (installmentId) {
    const inst = await tx.installment.findFirst({
      where: { id: installmentId, studentFeeId, tenantId },
    });
    if (!inst) throw Errors.notFound("Installment");

    let lateFee = Number(inst.lateFee);
    if (inst.status === "OVERDUE" && lateFee === 0) {
      lateFee = computeLateFee(
        {
          lateFeeAmount: fee.plan.lateFeeAmount ? Number(fee.plan.lateFeeAmount) : null,
          lateFeePercent: fee.plan.lateFeePercent ? Number(fee.plan.lateFeePercent) : null,
          gracePeriodDays: fee.plan.gracePeriodDays,
        },
        Number(inst.amount),
        inst.dueDate,
      );
    }

    const newPaid = Number(inst.paidAmount) + amount;
    const totalOwed = Number(inst.amount) + lateFee;
    const newStatus: Prisma.InstallmentUpdateInput["status"] =
      newPaid >= totalOwed ? "PAID" : newPaid > 0 ? "PARTIALLY_PAID" : inst.status;

    await tx.installment.update({
      where: { id: inst.id },
      data: {
        paidAmount: newPaid,
        lateFee,
        status: newStatus,
        paidAt: newStatus === "PAID" ? new Date() : inst.paidAt,
      },
    });
  } else {
    // No specific installment — distribute to earliest unpaid installments
    let remaining = amount;
    const installments = await tx.installment.findMany({
      where: {
        studentFeeId,
        tenantId,
        status: { in: ["UPCOMING", "DUE", "OVERDUE", "PARTIALLY_PAID"] },
      },
      orderBy: { installmentNumber: "asc" },
    });
    for (const inst of installments) {
      if (remaining <= 0) break;
      const owed = Number(inst.amount) + Number(inst.lateFee) - Number(inst.paidAmount);
      const apply = Math.min(owed, remaining);
      const newPaid = Number(inst.paidAmount) + apply;
      const totalOwed = Number(inst.amount) + Number(inst.lateFee);
      const newStatus =
        newPaid >= totalOwed ? "PAID" : newPaid > 0 ? "PARTIALLY_PAID" : inst.status;
      await tx.installment.update({
        where: { id: inst.id },
        data: {
          paidAmount: newPaid,
          status: newStatus,
          paidAt: newStatus === "PAID" ? new Date() : inst.paidAt,
        },
      });
      remaining -= apply;
    }
  }

  const newFeePaid = Number(fee.paidAmount) + amount;
  const newPending = Math.max(0, Number(fee.totalAmount) - newFeePaid);
  const newStatus: Prisma.StudentFeeUpdateInput["status"] =
    newPending === 0 ? "PAID" : newFeePaid > 0 ? "PARTIALLY_PAID" : "PENDING";
  await tx.studentFee.update({
    where: { id: fee.id },
    data: { paidAmount: newFeePaid, pendingAmount: newPending, status: newStatus },
  });
}

paymentsRouter.get("/", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const {
    page = "1",
    pageSize = "50",
    method,
    status,
    from,
    to,
  } = req.query as Record<string, string | undefined>;
  const p = Math.max(1, Number(page));
  const ps = Math.min(100, Math.max(1, Number(pageSize)));

  const where: Prisma.PaymentWhereInput = { tenantId };
  if (method) where.method = method as Prisma.PaymentWhereInput["method"];
  if (status) where.status = status as Prisma.PaymentWhereInput["status"];
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const [data, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        studentFee: {
          include: {
            student: {
              select: {
                id: true,
                rollNumber: true,
                user: { select: { id: true, name: true } },
                batch: { select: { id: true, name: true } },
              },
            },
            plan: { select: { id: true, name: true } },
          },
        },
        collectedBy: { select: { id: true, name: true } },
      },
      skip: (p - 1) * ps,
      take: ps,
      orderBy: { createdAt: "desc" },
    }),
    prisma.payment.count({ where }),
  ]);
  return paginated(res, data, { total, page: p, pageSize: ps });
});

paymentsRouter.post(
  "/record",
  requireRole("ADMIN", "TEACHER"),
  validate(RecordPaymentSchema),
  async (req, res) => {
    const tenantId = req.user!.tenantId;
    const body = req.body as import("@canop/types").RecordPayment;

    const fee = await prisma.studentFee.findFirst({
      where: { id: body.studentFeeId, tenantId },
      include: {
        student: { include: { user: { select: { name: true } } } },
        plan: { select: { tenantId: true } },
      },
    });
    if (!fee) throw Errors.notFound("Student fee");

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const tenantSlug = tenant?.slug ?? "DEMO";

    const { payment } = await withTenantTransaction(prisma, tenantId, async (tx) => {
      const receiptNumber = await nextReceiptNumber(tx, tenantId, tenantSlug);
      const payment = await tx.payment.create({
        data: {
          tenantId,
          studentFeeId: body.studentFeeId,
          installmentId: body.installmentId ?? null,
          amount: body.amount,
          method: body.method,
          status: "SUCCESS",
          receiptNumber,
          transactionRef: body.transactionRef ?? null,
          collectedById: req.user!.id,
          note: body.note ?? null,
          paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
        },
      });
      await applyPaymentAmount(tx, {
        tenantId,
        studentFeeId: body.studentFeeId,
        installmentId: body.installmentId ?? null,
        amount: body.amount,
      });
      return { payment };
    });

    emitToTenant(tenantId, "payment:received", {
      paymentId: payment.id,
      studentFeeId: body.studentFeeId,
      amount: body.amount,
      method: body.method,
    });
    emitToTenant(tenantId, "stats:updated", { reason: "payment" });

    const rupees = new Intl.NumberFormat("en-IN").format(body.amount);
    console.log(
      `[fee-paid] ${fee.student.user.name} — ₹${rupees} via ${body.method}  (receipt ${payment.receiptNumber})`,
    );

    void notifyPaymentReceived(tenantId, payment.id, tenant?.name ?? "");

    return ok(res, payment, 201);
  },
);

paymentsRouter.post("/razorpay/order", validate(RazorpayOrderSchema), async (req, res) => {
  const tenantId = req.user!.tenantId;
  const body = req.body as import("@canop/types").RazorpayOrder;

  const fee = await prisma.studentFee.findFirst({
    where: { id: body.studentFeeId, tenantId },
  });
  if (!fee) throw Errors.notFound("Student fee");

  if (req.user!.role === "STUDENT" || req.user!.role === "PARENT") {
    const student = await prisma.student.findUnique({ where: { id: fee.studentId } });
    if (!student) throw Errors.notFound("Student");
    if (req.user!.role === "STUDENT" && student.userId !== req.user!.id) {
      throw Errors.forbidden();
    }
    if (req.user!.role === "PARENT") {
      const g = await prisma.guardian.findFirst({
        where: { studentId: student.id, userId: req.user!.id },
      });
      if (!g) throw Errors.forbidden();
    }
  }

  const amountPaise = Math.round(body.amount * 100);

  let orderId: string;
  if (razorpayClient) {
    // TODO: real Razorpay order (requires valid test keys)
    const order = await razorpayClient.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `rct_${Date.now()}`,
    });
    orderId = order.id;
  } else {
    orderId = `order_mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  const payment = await withTenantTransaction(prisma, tenantId, (tx) =>
    tx.payment.create({
      data: {
        tenantId,
        studentFeeId: body.studentFeeId,
        installmentId: body.installmentId ?? null,
        amount: body.amount,
        method: "RAZORPAY_ONLINE",
        status: "PENDING",
        razorpayOrderId: orderId,
      },
    }),
  );

  return ok(res, {
    paymentId: payment.id,
    orderId,
    amount: body.amount,
    amountPaise,
    currency: "INR",
    key: env.RAZORPAY_KEY_ID,
    stub: razorpayClient === null,
  });
});

paymentsRouter.post("/razorpay/verify", validate(RazorpayVerifySchema), async (req, res) => {
  const tenantId = req.user!.tenantId;
  const body = req.body as import("@canop/types").RazorpayVerify;

  const payment = await prisma.payment.findFirst({
    where: { razorpayOrderId: body.razorpayOrderId, tenantId },
  });
  if (!payment) throw Errors.notFound("Payment order");
  if (payment.status === "SUCCESS") {
    return ok(res, { paymentId: payment.id, verified: true, alreadyVerified: true });
  }

  let verified = false;
  if (razorpayClient) {
    const expected = crypto
      .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
      .update(`${body.razorpayOrderId}|${body.razorpayPaymentId}`)
      .digest("hex");
    verified = expected === body.razorpaySignature;
  } else {
    // Stub — accept whatever signature the client sent
    verified = true;
  }

  if (!verified) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    throw Errors.badRequest("Razorpay signature verification failed", "PAYMENT_VERIFY_FAILED");
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  const tenantSlug = tenant?.slug ?? "DEMO";

  const updatedPayment = await withTenantTransaction(prisma, tenantId, async (tx) => {
    const receiptNumber = await nextReceiptNumber(tx, tenantId, tenantSlug);
    const u = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "SUCCESS",
        razorpayPaymentId: body.razorpayPaymentId,
        razorpaySignature: body.razorpaySignature,
        receiptNumber,
        paidAt: new Date(),
      },
    });
    await applyPaymentAmount(tx, {
      tenantId,
      studentFeeId: payment.studentFeeId,
      installmentId: payment.installmentId,
      amount: Number(payment.amount),
    });
    return u;
  });

  emitToTenant(tenantId, "payment:received", {
    paymentId: updatedPayment.id,
    studentFeeId: updatedPayment.studentFeeId,
    amount: Number(updatedPayment.amount),
    method: "RAZORPAY_ONLINE",
  });
  emitToTenant(tenantId, "stats:updated", { reason: "payment" });

  const rupees = new Intl.NumberFormat("en-IN").format(Number(updatedPayment.amount));
  console.log(
    `[fee-paid] online — ₹${rupees} via RAZORPAY  (receipt ${updatedPayment.receiptNumber})`,
  );

  void notifyPaymentReceived(tenantId, updatedPayment.id, tenant?.name ?? "");

  return ok(res, {
    paymentId: updatedPayment.id,
    verified: true,
    receiptNumber: updatedPayment.receiptNumber,
  });
});

paymentsRouter.get("/:id", async (req, res) => {
  const id = req.params.id as string;
  const payment = await prisma.payment.findFirst({
    where: { id, tenantId: req.user!.tenantId },
    include: {
      studentFee: {
        include: {
          student: {
            include: {
              user: { select: { id: true, name: true, email: true, phone: true } },
              batch: { select: { id: true, name: true } },
            },
          },
          plan: true,
        },
      },
      installment: true,
      collectedBy: { select: { id: true, name: true } },
    },
  });
  if (!payment) throw Errors.notFound("Payment");
  return ok(res, payment);
});

paymentsRouter.get("/:id/receipt", async (req, res) => {
  const id = req.params.id as string;
  const p = await prisma.payment.findFirst({
    where: { id, tenantId: req.user!.tenantId },
    include: {
      studentFee: {
        include: {
          student: {
            include: {
              user: { select: { id: true, name: true, email: true, phone: true } },
              batch: { select: { id: true, name: true } },
            },
          },
          plan: { select: { id: true, name: true, academicYear: true } },
        },
      },
      installment: true,
      collectedBy: { select: { id: true, name: true } },
    },
  });
  if (!p) throw Errors.notFound("Payment");

  const tenant = await prisma.tenant.findUnique({ where: { id: req.user!.tenantId } });

  return ok(res, {
    receiptNumber: p.receiptNumber,
    issuedAt: p.paidAt ?? p.createdAt,
    institute: { name: tenant?.name, slug: tenant?.slug, tagline: tenant?.tagline },
    student: {
      name: p.studentFee.student.user.name,
      rollNumber: p.studentFee.student.rollNumber,
      batch: p.studentFee.student.batch?.name ?? null,
      email: p.studentFee.student.user.email,
      phone: p.studentFee.student.user.phone,
    },
    plan: p.studentFee.plan,
    installment: p.installment
      ? {
          number: p.installment.installmentNumber,
          amount: Number(p.installment.amount),
          dueDate: p.installment.dueDate,
        }
      : null,
    payment: {
      amount: Number(p.amount),
      method: p.method,
      transactionRef: p.transactionRef,
      status: p.status,
      note: p.note,
    },
    collectedBy: p.collectedBy?.name ?? null,
  });
});

paymentsRouter.post("/:id/refund", requireRole("ADMIN"), async (req, res) => {
  const id = req.params.id as string;
  const p = await prisma.payment.findFirst({ where: { id, tenantId: req.user!.tenantId } });
  if (!p) throw Errors.notFound("Payment");
  if (p.status !== "SUCCESS") throw Errors.badRequest("Only successful payments can be refunded");

  const updated = await withTenantTransaction(prisma, req.user!.tenantId, async (tx) => {
    await applyPaymentAmount(tx, {
      tenantId: req.user!.tenantId,
      studentFeeId: p.studentFeeId,
      installmentId: p.installmentId,
      amount: -Number(p.amount),
    });
    return tx.payment.update({ where: { id }, data: { status: "REFUNDED" } });
  });
  emitToTenant(req.user!.tenantId, "payment:refunded", { paymentId: id });
  return ok(res, updated);
});
