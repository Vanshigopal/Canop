import type { PrismaClient } from "@prisma/client";
import { subDays, differenceInDays } from "date-fns";
import { prisma, withTenantTransaction } from "@/config/db";

/**
 * D1 — Composite engagement score 0-100 per student.
 *
 * Weights:
 *   Attendance   30%
 *   Marks        25%
 *   Assignment   20%  (neutral 50 until Session 12)
 *   Video        15%  (neutral 50 until Session 12)
 *   Login        10%
 */
export interface EngagementBreakdown {
  score: number;
  attendanceScore: number;
  marksScore: number;
  assignmentScore: number;
  videoScore: number;
  loginScore: number;
  riskFactors: string[];
}

const WEIGHTS = {
  attendance: 0.30,
  marks: 0.25,
  assignment: 0.20,
  video: 0.15,
  login: 0.10,
};

function scoreAttendance(percent: number): number {
  if (percent >= 95) return 100;
  if (percent >= 85) return 90;
  if (percent >= 75) return 75;
  if (percent >= 60) return 50;
  return 25;
}

function scoreMarks(percent: number, trend: "up" | "down" | "flat" | null): number {
  let base: number;
  if (percent >= 80) base = 100;
  else if (percent >= 70) base = 80;
  else if (percent >= 60) base = 60;
  else if (percent >= 50) base = 40;
  else if (percent >= 40) base = 20;
  else base = 10;

  if (trend === "up") base = Math.min(100, base + 10);
  else if (trend === "down") base = Math.max(0, base - 10);
  return base;
}

function scoreLogin(lastLoginAt: Date | null): number {
  if (!lastLoginAt) return 0;
  const days = differenceInDays(new Date(), lastLoginAt);
  if (days <= 2) return 100;
  if (days <= 7) return 80;
  if (days <= 14) return 60;
  if (days <= 30) return 30;
  return 0;
}

export async function computeEngagementScore(
  tenantId: string,
  studentId: string,
): Promise<EngagementBreakdown> {
  return withTenantTransaction(prisma, tenantId, async (tx) => {
    return computeInTx(tx, studentId);
  });
}

async function computeInTx(
  tx: PrismaClient,
  studentId: string,
): Promise<EngagementBreakdown> {
  const today = new Date();
  const thirtyDaysAgo = subDays(today, 30);

  const student = await tx.student.findFirst({
    where: { id: studentId },
    include: { user: true },
  });
  if (!student) {
    return {
      score: 0,
      attendanceScore: 0,
      marksScore: 0,
      assignmentScore: 50,
      videoScore: 50,
      loginScore: 0,
      riskFactors: [],
    };
  }

  // Attendance — last 30 days, LECTURE only
  const attendance = await tx.attendanceRecord.findMany({
    where: {
      studentId,
      session: { type: "LECTURE", date: { gte: thirtyDaysAgo } },
    },
    include: { session: true },
  });
  const attendanceTotal = attendance.length;
  const attendancePresent = attendance.filter(
    (r) => r.status === "PRESENT" || r.status === "LATE",
  ).length;
  const attendancePercent =
    attendanceTotal > 0 ? (attendancePresent / attendanceTotal) * 100 : 0;
  const attendanceScore = attendanceTotal > 0 ? scoreAttendance(attendancePercent) : 50;

  // Marks — most recent published exam with trend
  const recentMarks = await tx.markEntry.findMany({
    where: {
      studentId,
      exam: { status: "PUBLISHED", deletedAt: null },
      isAbsent: false,
      percentage: { not: null },
    },
    orderBy: { exam: { publishedAt: "desc" } },
    take: 5,
    include: { exam: true },
  });
  let marksScore = 50;
  let mostRecentTrend: "up" | "down" | "flat" | null = null;
  let mostRecentPercent: number | null = null;
  let mostRecentIsFailed = false;
  const latest = recentMarks[0];
  if (latest) {
    mostRecentPercent = Number(latest.percentage);
    mostRecentTrend =
      latest.trendDirection === "up" || latest.trendDirection === "down" || latest.trendDirection === "flat"
        ? (latest.trendDirection as "up" | "down" | "flat")
        : null;
    mostRecentIsFailed = latest.isPassed === false;
    marksScore = scoreMarks(mostRecentPercent, mostRecentTrend);
  }

  // Login
  const loginScore = scoreLogin(student.user.lastLoginAt);

  // Assignment / video — real scores (Session 12)
  const assignmentScore = await computeAssignmentScore(tx, studentId);
  const videoScore = await computeVideoScore(tx, studentId);

  const score =
    attendanceScore * WEIGHTS.attendance +
    marksScore * WEIGHTS.marks +
    assignmentScore * WEIGHTS.assignment +
    videoScore * WEIGHTS.video +
    loginScore * WEIGHTS.login;

  const riskFactors: string[] = [];
  if (attendanceTotal > 0 && attendancePercent < 75) riskFactors.push("attendance_below_75");
  if (mostRecentTrend === "down") riskFactors.push("marks_declining");
  if (mostRecentIsFailed) riskFactors.push("failing_exams");
  if (!student.user.lastLoginAt) riskFactors.push("inactive_login");
  else if (differenceInDays(today, student.user.lastLoginAt) > 14) riskFactors.push("inactive_login");

  return {
    score: Math.round(score * 100) / 100,
    attendanceScore: Math.round(attendanceScore * 100) / 100,
    marksScore: Math.round(marksScore * 100) / 100,
    assignmentScore,
    videoScore,
    loginScore: Math.round(loginScore * 100) / 100,
    riskFactors,
  };
}

export async function computeEngagementBatch(
  tenantId: string,
  studentIds: string[],
): Promise<Map<string, EngagementBreakdown>> {
  const result = new Map<string, EngagementBreakdown>();
  if (studentIds.length === 0) return result;
  return withTenantTransaction(prisma, tenantId, async (tx) => {
    for (const id of studentIds) {
      result.set(id, await computeInTx(tx, id));
    }
    return result;
  });
}

/**
 * Compute 0-100 score from assignment submission rate in last 90 days.
 * Neutral 50 if student has no eligible assignments (can't be measured).
 */
async function computeAssignmentScore(
  tx: PrismaClient,
  studentId: string,
): Promise<number> {
  const student = await tx.student.findUnique({
    where: { id: studentId },
    select: { batchId: true },
  });
  if (!student || !student.batchId) return 50;

  const ninetyDaysAgo = subDays(new Date(), 90);

  const eligibleAssignments = await tx.assignment.findMany({
    where: {
      batchId: student.batchId,
      status: { in: ["PUBLISHED", "CLOSED"] },
      publishedAt: { gte: ninetyDaysAgo },
      deletedAt: null,
    },
    select: { id: true },
  });

  if (eligibleAssignments.length === 0) return 50;

  const submitted = await tx.assignmentSubmission.count({
    where: {
      studentId,
      assignmentId: { in: eligibleAssignments.map((a) => a.id) },
      status: { in: ["SUBMITTED", "LATE_SUBMITTED", "GRADED"] },
    },
  });

  const rate = submitted / eligibleAssignments.length;
  return Math.round(rate * 100);
}

/**
 * Compute 0-100 score from average video completion % in last 90 days.
 * Neutral 50 if no accessible videos exist for this student.
 */
async function computeVideoScore(tx: PrismaClient, studentId: string): Promise<number> {
  const student = await tx.student.findUnique({
    where: { id: studentId },
    select: { batchId: true },
  });
  if (!student || !student.batchId) return 50;

  const ninetyDaysAgo = subDays(new Date(), 90);

  const accessibleVideos = await tx.videoLecture.findMany({
    where: {
      isPublished: true,
      status: "READY",
      deletedAt: null,
      createdAt: { gte: ninetyDaysAgo },
      OR: [
        { accessType: "INSTITUTE" },
        { batchAccess: { some: { batchId: student.batchId } } },
      ],
    },
    select: { id: true },
  });

  if (accessibleVideos.length === 0) return 50;

  const videoIds = accessibleVideos.map((v) => v.id);

  const bestPerVideo = await tx.videoWatchSession.groupBy({
    by: ["videoId"],
    where: {
      studentId,
      videoId: { in: videoIds },
    },
    _max: { completionPercent: true },
  });

  if (bestPerVideo.length === 0) return 0;

  const totalCompletion = bestPerVideo.reduce(
    (sum, ws) => sum + Number(ws._max.completionPercent ?? 0),
    0,
  );
  const avg = totalCompletion / accessibleVideos.length;

  return Math.round(Math.min(100, avg));
}

/**
 * Daily snapshot: compute + upsert for all active students.
 * Idempotent via (studentId, snapshotDate) unique.
 */
export async function snapshotEngagementForTenant(tenantId: string): Promise<number> {
  return withTenantTransaction(prisma, tenantId, async (tx) => {
    const students = await tx.student.findMany({
      where: { deletedAt: null },
      select: { id: true },
    });
    const today = new Date();
    const snapshotDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

    let count = 0;
    for (const s of students) {
      const breakdown = await computeInTx(tx, s.id);
      await tx.engagementSnapshot.upsert({
        where: { studentId_snapshotDate: { studentId: s.id, snapshotDate } },
        update: {
          score: breakdown.score,
          attendanceScore: breakdown.attendanceScore,
          marksScore: breakdown.marksScore,
          assignmentScore: breakdown.assignmentScore,
          videoScore: breakdown.videoScore,
          loginScore: breakdown.loginScore,
          riskFactors: breakdown.riskFactors,
        },
        create: {
          tenantId,
          studentId: s.id,
          snapshotDate,
          score: breakdown.score,
          attendanceScore: breakdown.attendanceScore,
          marksScore: breakdown.marksScore,
          assignmentScore: breakdown.assignmentScore,
          videoScore: breakdown.videoScore,
          loginScore: breakdown.loginScore,
          riskFactors: breakdown.riskFactors,
        },
      });
      count += 1;
    }
    return count;
  });
}
