import { differenceInDays } from "date-fns";
import { prisma, withTenantTransaction } from "@/config/db";

/**
 * B5 — Per-parent optimal fee reminder offset.
 *
 * Analyzes payment history: how many days past due do parents typically pay?
 * Reminder is sent (avgDelay + 5) days before the due date, capped at 14.
 */
export async function calculateOptimalReminderOffsets(
  tenantId: string,
): Promise<Map<string, number>> {
  return withTenantTransaction(prisma, tenantId, async (tx) => {
    const payments = await tx.payment.findMany({
      where: { status: "SUCCESS", installmentId: { not: null } },
      include: {
        installment: true,
        studentFee: {
          include: {
            student: {
              include: { guardians: true },
            },
          },
        },
      },
    });

    const parentStats = new Map<string, { totalDelayDays: number; count: number }>();

    for (const p of payments) {
      if (!p.installment || !p.paidAt) continue;
      const delayDays = Math.max(0, differenceInDays(p.paidAt, p.installment.dueDate));
      for (const guardian of p.studentFee.student.guardians) {
        if (!guardian.userId) continue;
        const s = parentStats.get(guardian.userId) || { totalDelayDays: 0, count: 0 };
        s.totalDelayDays += delayDays;
        s.count += 1;
        parentStats.set(guardian.userId, s);
      }
    }

    const offsets = new Map<string, number>();
    for (const [userId, s] of parentStats) {
      const avgDelay = s.totalDelayDays / s.count;
      const offset = Math.ceil(3 + avgDelay + 2);
      offsets.set(userId, Math.min(offset, 14));
    }
    return offsets;
  });
}

export interface ReminderOffsetRow {
  parentUserId: string;
  parentName: string;
  avgDaysLate: number;
  paymentCount: number;
  recommendedOffsetDays: number;
}

export async function listReminderOffsets(
  tenantId: string,
): Promise<ReminderOffsetRow[]> {
  return withTenantTransaction(prisma, tenantId, async (tx) => {
    const payments = await tx.payment.findMany({
      where: { status: "SUCCESS", installmentId: { not: null } },
      include: {
        installment: true,
        studentFee: {
          include: {
            student: {
              include: {
                guardians: { include: { user: true } },
              },
            },
          },
        },
      },
    });

    const parentStats = new Map<
      string,
      { totalDelayDays: number; count: number; name: string }
    >();
    for (const p of payments) {
      if (!p.installment || !p.paidAt) continue;
      const delayDays = Math.max(0, differenceInDays(p.paidAt, p.installment.dueDate));
      for (const guardian of p.studentFee.student.guardians) {
        if (!guardian.userId || !guardian.user) continue;
        const s = parentStats.get(guardian.userId) || {
          totalDelayDays: 0,
          count: 0,
          name: guardian.user.name,
        };
        s.totalDelayDays += delayDays;
        s.count += 1;
        s.name = guardian.user.name;
        parentStats.set(guardian.userId, s);
      }
    }

    const rows: ReminderOffsetRow[] = [];
    for (const [userId, s] of parentStats) {
      const avg = s.totalDelayDays / s.count;
      const offset = Math.min(14, Math.ceil(3 + avg + 2));
      rows.push({
        parentUserId: userId,
        parentName: s.name,
        avgDaysLate: Math.round(avg * 10) / 10,
        paymentCount: s.count,
        recommendedOffsetDays: offset,
      });
    }
    return rows.sort((a, b) => b.avgDaysLate - a.avgDaysLate);
  });
}
