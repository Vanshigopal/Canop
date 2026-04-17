import type { InstallmentFrequency } from "@prisma/client";

export interface InstallmentSchedule {
  installmentNumber: number;
  amount: number;
  dueDate: Date;
}

function addMonths(base: Date, months: number, dueDay: number): Date {
  const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  const day = Math.min(dueDay, lastDay);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), day));
}

/**
 * Generate installment schedule based on frequency.
 * Splits totalAmount evenly across installments (final installment absorbs any rounding).
 * Starts from `startDate` on `dueDay`, handles months with fewer days.
 */
export function generateInstallments(
  totalAmount: number,
  count: number,
  frequency: InstallmentFrequency,
  startDate: Date,
  dueDay: number,
): InstallmentSchedule[] {
  if (count < 1) return [];
  const monthsBetween: Record<InstallmentFrequency, number> = {
    MONTHLY: 1,
    QUARTERLY: 3,
    HALF_YEARLY: 6,
    ANNUALLY: 12,
    CUSTOM: 1,
  };
  const gap = monthsBetween[frequency];

  const per = Math.floor((totalAmount / count) * 100) / 100;
  const last = Math.round((totalAmount - per * (count - 1)) * 100) / 100;

  const schedule: InstallmentSchedule[] = [];
  for (let i = 0; i < count; i++) {
    const dueDate = addMonths(startDate, gap * i, dueDay);
    schedule.push({
      installmentNumber: i + 1,
      amount: i === count - 1 ? last : per,
      dueDate,
    });
  }
  return schedule;
}

export interface ReceiptNumberOpts {
  tenantSlug: string;
  date: Date;
  sequence: number;
}

/**
 * Build receipt number: RCT-{TENANT}-{YYYYMMDD}-{seq3}
 */
export function buildReceiptNumber({ tenantSlug, date, sequence }: ReceiptNumberOpts): string {
  const tenantShort = tenantSlug.slice(0, 6).toUpperCase();
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const seq = String(sequence).padStart(3, "0");
  return `RCT-${tenantShort}-${y}${m}${d}-${seq}`;
}

/**
 * Compute late fee for an overdue installment (only after grace period).
 */
export function computeLateFee(
  plan: { lateFeeAmount: number | null; lateFeePercent: number | null; gracePeriodDays: number },
  installmentAmount: number,
  dueDate: Date,
  now: Date = new Date(),
): number {
  const graceEnd = new Date(dueDate);
  graceEnd.setUTCDate(graceEnd.getUTCDate() + plan.gracePeriodDays);
  if (now <= graceEnd) return 0;
  if (plan.lateFeeAmount && plan.lateFeeAmount > 0) return Number(plan.lateFeeAmount);
  if (plan.lateFeePercent && plan.lateFeePercent > 0) {
    return Math.round(installmentAmount * (Number(plan.lateFeePercent) / 100) * 100) / 100;
  }
  return 0;
}
