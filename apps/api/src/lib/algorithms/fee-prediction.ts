import type { PrismaClient } from "@prisma/client";
import { differenceInDays } from "date-fns";
import { prisma, withTenantTransaction } from "@/config/db";

/**
 * C3 — Fee payment reliability prediction.
 *
 * Features (weighted):
 *   onTimeRatio        0.35
 *   avgDaysLate (inv)  0.20
 *   overdueCount (inv) 0.20
 *   historyLength      0.10
 *   paymentRecency     0.15
 *
 * Returns probability (0-1) that the parent pays on time.
 */
export interface FeeRiskPrediction {
  probability: number;
  confidence: "low" | "medium" | "high";
  factors: Array<{ name: string; impact: number }>;
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

async function computeForStudentFee(
  tx: PrismaClient,
  studentFeeId: string,
): Promise<FeeRiskPrediction> {
  const studentFee = await tx.studentFee.findUnique({
    where: { id: studentFeeId },
    include: {
      student: true,
      payments: { include: { installment: true } },
      installments: true,
    },
  });
  if (!studentFee) {
    return { probability: 0.5, confidence: "low", factors: [] };
  }

  const successfulPayments = studentFee.payments.filter((p) => p.status === "SUCCESS" && p.installment && p.paidAt);

  let onTimeCount = 0;
  let totalDelay = 0;
  for (const p of successfulPayments) {
    if (!p.installment || !p.paidAt) continue;
    const delay = differenceInDays(p.paidAt, p.installment.dueDate);
    if (delay <= 0) onTimeCount += 1;
    totalDelay += Math.max(0, delay);
  }

  const payCount = successfulPayments.length;
  const onTimeRatio = payCount > 0 ? onTimeCount / payCount : 0.5;
  const avgDaysLate = payCount > 0 ? totalDelay / payCount : 0;

  const overdueCount = studentFee.installments.filter(
    (i) => i.status === "OVERDUE",
  ).length;

  const firstPaymentAt = successfulPayments
    .map((p) => p.paidAt!)
    .sort((a, b) => a.getTime() - b.getTime())[0];
  const historyDays = firstPaymentAt ? differenceInDays(new Date(), firstPaymentAt) : 0;

  const lastPaymentAt = successfulPayments
    .map((p) => p.paidAt!)
    .sort((a, b) => b.getTime() - a.getTime())[0];
  const daysSinceLastPayment = lastPaymentAt ? differenceInDays(new Date(), lastPaymentAt) : 999;

  // Normalize feature contributions
  const f_onTime = onTimeRatio; // 0..1
  const f_avgLate = Math.max(0, 1 - avgDaysLate / 30); // 30+ days avg late = 0
  const f_overdue = Math.max(0, 1 - overdueCount / 3); // 3+ overdue = 0
  const f_history = Math.min(1, historyDays / 365);
  const f_recency = Math.max(0, 1 - daysSinceLastPayment / 60);

  // Logistic-regression-style composite
  const linear =
    (f_onTime - 0.5) * 4 * 0.35 +
    (f_avgLate - 0.5) * 4 * 0.20 +
    (f_overdue - 0.5) * 4 * 0.20 +
    (f_history - 0.5) * 2 * 0.10 +
    (f_recency - 0.5) * 4 * 0.15;

  const probability = Math.round(sigmoid(linear) * 10000) / 10000;

  let confidence: "low" | "medium" | "high" = "low";
  if (payCount >= 5) confidence = "high";
  else if (payCount >= 2) confidence = "medium";

  const factors = [
    { name: "on_time_ratio", impact: Math.round(f_onTime * 1000) / 1000 },
    { name: "avg_days_late", impact: Math.round(avgDaysLate * 10) / 10 },
    { name: "overdue_count", impact: overdueCount },
    { name: "history_days", impact: historyDays },
    { name: "days_since_last_payment", impact: daysSinceLastPayment },
  ];

  return { probability, confidence, factors };
}

export async function predictPaymentReliability(
  tenantId: string,
  studentFeeId: string,
): Promise<FeeRiskPrediction> {
  return withTenantTransaction(prisma, tenantId, (tx) => computeForStudentFee(tx, studentFeeId));
}

export interface FeeRiskRow {
  studentFeeId: string;
  studentId: string;
  studentName: string;
  pendingAmount: number;
  probability: number;
  confidence: "low" | "medium" | "high";
  riskScore: number;
}

export async function listFeeRisks(tenantId: string): Promise<FeeRiskRow[]> {
  return withTenantTransaction(prisma, tenantId, async (tx) => {
    const fees = await tx.studentFee.findMany({
      where: { status: { in: ["PENDING", "PARTIALLY_PAID", "OVERDUE"] } },
      include: {
        student: { include: { user: true } },
      },
    });

    const rows: FeeRiskRow[] = [];
    for (const f of fees) {
      const pred = await computeForStudentFee(tx, f.id);
      rows.push({
        studentFeeId: f.id,
        studentId: f.studentId,
        studentName: f.student.user.name,
        pendingAmount: Number(f.pendingAmount),
        probability: pred.probability,
        confidence: pred.confidence,
        riskScore: Math.round((1 - pred.probability) * 100),
      });
    }

    return rows.sort((a, b) => b.riskScore - a.riskScore);
  });
}
