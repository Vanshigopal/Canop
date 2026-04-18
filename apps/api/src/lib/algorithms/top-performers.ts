import type { PrismaClient } from "@prisma/client";
import { subMonths } from "date-fns";
import { prisma, withTenantTransaction } from "@/config/db";
import { computeEngagementBatch } from "./engagement";

/**
 * D4 — Top performers this month across 4 criteria.
 */
export interface TopPerformer {
  studentId: string;
  studentName: string;
  batchId: string | null;
  batchName: string | null;
  reasons: string[];
}

export async function getTopPerformers(
  tenantId: string,
  batchId?: string,
  monthsBack = 1,
): Promise<TopPerformer[]> {
  return withTenantTransaction(prisma, tenantId, async (tx) => {
    return topPerformersInTx(tx, tenantId, batchId, monthsBack);
  });
}

async function topPerformersInTx(
  tx: PrismaClient,
  tenantId: string,
  batchId: string | undefined,
  monthsBack: number,
): Promise<TopPerformer[]> {
  const since = subMonths(new Date(), monthsBack);

  const students = await tx.student.findMany({
    where: {
      deletedAt: null,
      ...(batchId ? { batchId } : {}),
    },
    include: {
      user: { select: { id: true, name: true } },
      batch: { select: { id: true, name: true } },
    },
  });
  if (students.length === 0) return [];

  const byStudent = new Map<string, TopPerformer>();
  const ensure = (id: string): TopPerformer | null => {
    if (byStudent.has(id)) return byStudent.get(id)!;
    const s = students.find((x) => x.id === id);
    if (!s) return null;
    const p: TopPerformer = {
      studentId: s.id,
      studentName: s.user.name,
      batchId: s.batch?.id ?? null,
      batchName: s.batch?.name ?? null,
      reasons: [],
    };
    byStudent.set(id, p);
    return p;
  };

  // 1. Highest attendance % (last monthsBack months, LECTURE)
  const attendanceBy = new Map<string, { present: number; total: number }>();
  const recs = await tx.attendanceRecord.findMany({
    where: {
      studentId: { in: students.map((s) => s.id) },
      session: { type: "LECTURE", date: { gte: since } },
    },
  });
  for (const r of recs) {
    const s = attendanceBy.get(r.studentId) || { present: 0, total: 0 };
    s.total += 1;
    if (r.status === "PRESENT" || r.status === "LATE") s.present += 1;
    attendanceBy.set(r.studentId, s);
  }
  const attPercents = Array.from(attendanceBy.entries())
    .filter(([, v]) => v.total >= 5)
    .map(([id, v]) => ({ id, pct: (v.present / v.total) * 100 }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3);
  for (const e of attPercents) {
    const p = ensure(e.id);
    if (p) p.reasons.push(`highest_attendance: ${Math.round(e.pct * 10) / 10}%`);
  }

  // 2. Highest marks average
  const marks = await tx.markEntry.findMany({
    where: {
      studentId: { in: students.map((s) => s.id) },
      isAbsent: false,
      percentage: { not: null },
      exam: {
        status: "PUBLISHED",
        publishedAt: { gte: since },
        deletedAt: null,
      },
    },
    select: { studentId: true, percentage: true },
  });
  const marksBy = new Map<string, number[]>();
  for (const m of marks) {
    const arr = marksBy.get(m.studentId) || [];
    arr.push(Number(m.percentage));
    marksBy.set(m.studentId, arr);
  }
  const marksAverages = Array.from(marksBy.entries())
    .map(([id, arr]) => ({ id, avg: arr.reduce((a, b) => a + b, 0) / arr.length }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 3);
  for (const e of marksAverages) {
    const p = ensure(e.id);
    if (p) p.reasons.push(`highest_marks: ${Math.round(e.avg * 10) / 10}%`);
  }

  // 3. Most improved — largest positive trend
  const mostImproved = await tx.markEntry.findMany({
    where: {
      studentId: { in: students.map((s) => s.id) },
      isAbsent: false,
      percentage: { not: null },
      trendDirection: "up",
      exam: {
        status: "PUBLISHED",
        publishedAt: { gte: since },
        deletedAt: null,
      },
    },
    orderBy: { exam: { publishedAt: "desc" } },
  });
  // Approximate improvement = percentage difference from earliest to latest
  const improvedBy = new Map<string, { first: number; last: number }>();
  for (const m of [...mostImproved].reverse()) {
    const entry = improvedBy.get(m.studentId) || {
      first: Number(m.percentage),
      last: Number(m.percentage),
    };
    entry.last = Number(m.percentage);
    improvedBy.set(m.studentId, entry);
  }
  const improvements = Array.from(improvedBy.entries())
    .map(([id, v]) => ({ id, delta: v.last - v.first }))
    .filter((x) => x.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 3);
  for (const e of improvements) {
    const p = ensure(e.id);
    if (p) p.reasons.push(`most_improved: +${Math.round(e.delta * 10) / 10}%`);
  }

  // 4. Best engagement score
  const breakdowns = await computeEngagementBatch(
    tenantId,
    students.map((s) => s.id),
  );
  const engagementSorted = Array.from(breakdowns.entries())
    .map(([id, b]) => ({ id, score: b.score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  for (const e of engagementSorted) {
    const p = ensure(e.id);
    if (p) p.reasons.push(`best_engagement: ${Math.round(e.score)}/100`);
  }

  return Array.from(byStudent.values()).filter((p) => p.reasons.length > 0);
}
