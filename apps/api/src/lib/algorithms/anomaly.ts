import type { PrismaClient, AttendanceRecord, AttendanceSession } from "@prisma/client";
import { subDays, format, differenceInDays } from "date-fns";
import { prisma, withTenantTransaction } from "@/config/db";
import { standardDeviation } from "./stats-util";

/**
 * C1 — Attendance anomaly detection via z-score.
 * Compares last-30-day attendance % to personal 90-day baseline.
 */
export interface AnomalyResult {
  studentId: string;
  studentName: string;
  baselinePercent: number;
  recentPercent: number;
  zScore: number;
  severity: "mild" | "moderate" | "severe";
  daysEvaluated: number;
}

type RecordWithSession = AttendanceRecord & { session: AttendanceSession };

function groupByWeek(records: RecordWithSession[]): RecordWithSession[][] {
  const weeks = new Map<string, RecordWithSession[]>();
  for (const r of records) {
    const week = format(r.session.date, "yyyy-ww");
    if (!weeks.has(week)) weeks.set(week, []);
    weeks.get(week)!.push(r);
  }
  return Array.from(weeks.values());
}

export async function detectAttendanceAnomalies(
  tenantId: string,
): Promise<AnomalyResult[]> {
  return withTenantTransaction(prisma, tenantId, async (tx) => {
    return detectAnomaliesInTx(tx, tenantId);
  });
}

async function detectAnomaliesInTx(
  tx: PrismaClient,
  _tenantId: string,
): Promise<AnomalyResult[]> {
  const students = await tx.student.findMany({
    where: { deletedAt: null },
    include: { user: true },
  });

  const today = new Date();
  const recentStart = subDays(today, 30);
  const baselineStart = subDays(today, 90);
  const results: AnomalyResult[] = [];

  for (const student of students) {
    const records = await tx.attendanceRecord.findMany({
      where: {
        studentId: student.id,
        session: {
          type: "LECTURE",
          date: { gte: baselineStart, lte: today },
        },
      },
      include: { session: true },
    });

    if (records.length < 15) continue;

    const recent = records.filter((r) => r.session.date >= recentStart);
    const baseline = records.filter((r) => r.session.date < recentStart);
    if (recent.length < 5 || baseline.length < 10) continue;

    const recentPercent =
      (recent.filter((r) => r.status === "PRESENT").length / recent.length) * 100;
    const baselinePercent =
      (baseline.filter((r) => r.status === "PRESENT").length / baseline.length) * 100;

    const weeks = groupByWeek(baseline);
    if (weeks.length < 3) continue;
    const weeklyPercents = weeks.map(
      (w) => (w.filter((r) => r.status === "PRESENT").length / w.length) * 100,
    );
    const sd = standardDeviation(weeklyPercents);
    if (sd < 2) continue;

    const z = (recentPercent - baselinePercent) / sd;
    if (z < -1.5) {
      const severity = z < -2.5 ? "severe" : z < -2.0 ? "moderate" : "mild";
      results.push({
        studentId: student.id,
        studentName: student.user.name,
        baselinePercent: Math.round(baselinePercent * 10) / 10,
        recentPercent: Math.round(recentPercent * 10) / 10,
        zScore: Math.round(z * 100) / 100,
        severity,
        daysEvaluated: 30,
      });
    }
  }

  return results.sort((a, b) => a.zScore - b.zScore);
}

/**
 * C4 — Login drop-off detection.
 * Flags users who haven't logged in for >= thresholdDays.
 */
export interface DropOffUser {
  userId: string;
  name: string;
  role: string;
  lastLoginAt: Date | null;
  daysInactive: number;
}

export async function detectLoginDropOff(
  tenantId: string,
  thresholdDays = 14,
): Promise<DropOffUser[]> {
  return withTenantTransaction(prisma, tenantId, async (tx) => {
    const cutoff = subDays(new Date(), thresholdDays);
    const users = await tx.user.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        role: { in: ["STUDENT", "PARENT"] },
        OR: [{ lastLoginAt: { lte: cutoff } }, { lastLoginAt: null }],
      },
      select: {
        id: true,
        name: true,
        role: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    const now = new Date();
    return users
      .map((u) => {
        const reference = u.lastLoginAt ?? u.createdAt;
        return {
          userId: u.id,
          name: u.name,
          role: u.role,
          lastLoginAt: u.lastLoginAt,
          daysInactive: differenceInDays(now, reference),
        };
      })
      .filter((u) => u.daysInactive >= thresholdDays)
      .sort((a, b) => b.daysInactive - a.daysInactive);
  });
}
