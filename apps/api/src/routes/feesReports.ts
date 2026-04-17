import { prisma, withTenantTransaction } from "@/config/db";
import { emitToTenant } from "@/config/socket";
import { computeLateFee } from "@/lib/fees";
import { ok } from "@/lib/response";
import { authenticate, requireRole } from "@/middleware/auth";
import type { Prisma } from "@prisma/client";
import { Router } from "express";

export const feesReportsRouter = Router();

feesReportsRouter.use(authenticate);

function startOfDayUTC(d: Date = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function startOfMonthUTC(d: Date = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

feesReportsRouter.get("/summary", requireRole("ADMIN", "TEACHER"), async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { batchId, from, to } = req.query as Record<string, string | undefined>;

  const feeWhere: Prisma.StudentFeeWhereInput = { tenantId };
  if (batchId) feeWhere.plan = { batchId };

  const fees = await prisma.studentFee.findMany({
    where: feeWhere,
    select: { totalAmount: true, paidAmount: true, pendingAmount: true, status: true },
  });

  const totalExpected = fees.reduce((s, f) => s + Number(f.totalAmount), 0);
  const totalCollected = fees.reduce((s, f) => s + Number(f.paidAmount), 0);
  const totalPending = fees.reduce((s, f) => s + Number(f.pendingAmount), 0);

  const overdueInstalls = await prisma.installment.findMany({
    where: {
      tenantId,
      status: "OVERDUE",
      ...(batchId ? { studentFee: { plan: { batchId } } } : {}),
    },
    select: { amount: true, paidAmount: true, lateFee: true },
  });
  const totalOverdue = overdueInstalls.reduce(
    (s, i) => s + (Number(i.amount) - Number(i.paidAmount) + Number(i.lateFee)),
    0,
  );

  const collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

  const studentsFullyPaid = fees.filter((f) => f.status === "PAID").length;
  const studentsPartiallyPaid = fees.filter((f) => f.status === "PARTIALLY_PAID").length;
  const studentsOverdue = fees.filter((f) => f.status === "OVERDUE").length;
  const studentsNoPay = fees.filter(
    (f) => f.status === "PENDING" && Number(f.paidAmount) === 0,
  ).length;

  // Monthly collection (from payments)
  const paymentWhere: Prisma.PaymentWhereInput = {
    tenantId,
    status: "SUCCESS",
  };
  if (from || to) {
    paymentWhere.paidAt = {};
    if (from) paymentWhere.paidAt.gte = new Date(from);
    if (to) paymentWhere.paidAt.lte = new Date(to);
  } else {
    paymentWhere.paidAt = { gte: startOfMonthUTC() };
  }
  const monthPayments = await prisma.payment.aggregate({
    where: paymentWhere,
    _sum: { amount: true },
    _count: true,
  });

  return ok(res, {
    totalExpected: round2(totalExpected),
    totalCollected: round2(totalCollected),
    totalPending: round2(totalPending),
    totalOverdue: round2(totalOverdue),
    collectionRate: round2(collectionRate),
    studentsFullyPaid,
    studentsPartiallyPaid,
    studentsOverdue,
    studentsNoPay,
    monthToDate: {
      amount: round2(Number(monthPayments._sum.amount ?? 0)),
      count: monthPayments._count,
    },
  });
});

feesReportsRouter.get("/overdue", requireRole("ADMIN", "TEACHER"), async (req, res) => {
  const tenantId = req.user!.tenantId;
  const today = startOfDayUTC();

  const rows = await prisma.installment.findMany({
    where: {
      tenantId,
      status: { in: ["OVERDUE", "DUE"] },
      studentFee: { status: { not: "WAIVED" } },
    },
    include: {
      studentFee: {
        include: {
          plan: { select: { id: true, name: true, lateFeeAmount: true, gracePeriodDays: true } },
          student: {
            select: {
              id: true,
              rollNumber: true,
              user: { select: { id: true, name: true, phone: true } },
              batch: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  const data = rows
    .filter((r) => {
      const graceEnd = new Date(r.dueDate);
      graceEnd.setUTCDate(graceEnd.getUTCDate() + r.studentFee.plan.gracePeriodDays);
      return graceEnd < today || r.status === "OVERDUE";
    })
    .map((r) => {
      const daysOverdue = Math.floor((today.getTime() - r.dueDate.getTime()) / 86400000);
      const outstanding = Number(r.amount) - Number(r.paidAmount) + Number(r.lateFee);
      return {
        installmentId: r.id,
        studentFeeId: r.studentFeeId,
        installmentNumber: r.installmentNumber,
        amount: Number(r.amount),
        paidAmount: Number(r.paidAmount),
        lateFee: Number(r.lateFee),
        outstanding: round2(outstanding),
        dueDate: r.dueDate,
        daysOverdue,
        status: r.status,
        plan: r.studentFee.plan,
        student: r.studentFee.student,
      };
    });

  return ok(res, data);
});

feesReportsRouter.get("/collection-trend", requireRole("ADMIN", "TEACHER"), async (req, res) => {
  const tenantId = req.user!.tenantId;
  const months = Math.min(12, Math.max(1, Number(req.query.months ?? 6)));

  const buckets: Array<{ key: string; start: Date; end: Date; label: string }> = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    buckets.push({
      key: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`,
      start,
      end,
      label: start.toLocaleString("en-IN", { month: "short", year: "2-digit", timeZone: "UTC" }),
    });
  }

  const payments = await prisma.payment.findMany({
    where: {
      tenantId,
      status: "SUCCESS",
      paidAt: { gte: buckets[0]!.start, lt: buckets[buckets.length - 1]!.end },
    },
    select: { amount: true, paidAt: true },
  });
  const installmentsDue = await prisma.installment.findMany({
    where: {
      tenantId,
      dueDate: { gte: buckets[0]!.start, lt: buckets[buckets.length - 1]!.end },
    },
    select: { amount: true, dueDate: true },
  });

  const data = buckets.map((b) => {
    const collected = payments
      .filter((p) => p.paidAt && p.paidAt >= b.start && p.paidAt < b.end)
      .reduce((s, p) => s + Number(p.amount), 0);
    const expected = installmentsDue
      .filter((i) => i.dueDate >= b.start && i.dueDate < b.end)
      .reduce((s, i) => s + Number(i.amount), 0);
    return {
      key: b.key,
      label: b.label,
      expected: round2(expected),
      collected: round2(collected),
    };
  });
  return ok(res, data);
});

feesReportsRouter.post(
  "/update-statuses",
  requireRole("ADMIN", "TEACHER", "STAFF"),
  async (req, res) => {
    const tenantId = req.user!.tenantId;
    const today = startOfDayUTC();

    const result = await withTenantTransaction(prisma, tenantId, async (tx) => {
      let upcomingToDue = 0;
      let dueToOverdue = 0;

      // UPCOMING → DUE if due date reached
      const upRows = await tx.installment.findMany({
        where: { tenantId, status: "UPCOMING", dueDate: { lte: today } },
        select: { id: true },
      });
      if (upRows.length > 0) {
        await tx.installment.updateMany({
          where: { id: { in: upRows.map((r) => r.id) } },
          data: { status: "DUE" },
        });
        upcomingToDue = upRows.length;
      }

      // DUE → OVERDUE if past grace period
      const dueRows = await tx.installment.findMany({
        where: { tenantId, status: "DUE" },
        include: { studentFee: { include: { plan: true } } },
      });
      for (const r of dueRows) {
        const graceEnd = new Date(r.dueDate);
        graceEnd.setUTCDate(graceEnd.getUTCDate() + r.studentFee.plan.gracePeriodDays);
        if (today > graceEnd) {
          const lateFee = computeLateFee(
            {
              lateFeeAmount: r.studentFee.plan.lateFeeAmount
                ? Number(r.studentFee.plan.lateFeeAmount)
                : null,
              lateFeePercent: r.studentFee.plan.lateFeePercent
                ? Number(r.studentFee.plan.lateFeePercent)
                : null,
              gracePeriodDays: r.studentFee.plan.gracePeriodDays,
            },
            Number(r.amount),
            r.dueDate,
            today,
          );
          await tx.installment.update({
            where: { id: r.id },
            data: { status: "OVERDUE", lateFee },
          });
          await tx.studentFee.update({
            where: { id: r.studentFeeId },
            data: {
              status: Number(r.studentFee.paidAmount) > 0 ? "PARTIALLY_PAID" : "OVERDUE",
            },
          });
          dueToOverdue += 1;
        }
      }

      return { upcomingToDue, dueToOverdue };
    });

    if (result.upcomingToDue > 0 || result.dueToOverdue > 0) {
      emitToTenant(tenantId, "fees:status-refreshed", result);
    }
    return ok(res, result);
  },
);

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
