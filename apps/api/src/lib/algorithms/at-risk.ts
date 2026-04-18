import { subDays, differenceInDays } from "date-fns";
import { prisma, withTenantTransaction } from "@/config/db";
import { computeEngagementBatch } from "./engagement";
import { detectAttendanceAnomalies } from "./anomaly";

/**
 * D5 — Priority list of at-risk students needing intervention.
 */
export interface AtRiskStudent {
  studentId: string;
  studentName: string;
  batchId: string | null;
  batchName: string | null;
  riskScore: number;
  topReasons: string[];
  suggestedAction: string;
  engagementScore: number;
}

function pickAction(reasons: string[]): string {
  if (reasons.includes("severe_attendance_anomaly")) return "Contact parent — attendance dropping sharply";
  if (reasons.includes("failing_recent_exams")) return "Schedule academic counselling";
  if (reasons.includes("fee_overdue_30d")) return "Send final fee reminder";
  if (reasons.includes("inactive_login_14d")) return "Reach out to confirm engagement";
  if (reasons.includes("no_retest_scheduled")) return "Schedule retest immediately";
  return "Review engagement breakdown";
}

export async function getAtRiskStudents(
  tenantId: string,
  limit = 20,
): Promise<AtRiskStudent[]> {
  return withTenantTransaction(prisma, tenantId, async (tx) => {
    const students = await tx.student.findMany({
      where: { deletedAt: null },
      include: {
        user: { select: { id: true, name: true, lastLoginAt: true } },
        batch: { select: { id: true, name: true } },
      },
    });
    if (students.length === 0) return [];

    const engagement = await computeEngagementBatch(
      tenantId,
      students.map((s) => s.id),
    );
    const anomalies = await detectAttendanceAnomalies(tenantId);
    const anomalyMap = new Map(anomalies.map((a) => [a.studentId, a]));

    const thirtyDaysAgo = subDays(new Date(), 30);
    const results: AtRiskStudent[] = [];

    for (const s of students) {
      const breakdown = engagement.get(s.id) ?? {
        score: 50,
        attendanceScore: 50,
        marksScore: 50,
        assignmentScore: 50,
        videoScore: 50,
        loginScore: 50,
        riskFactors: [],
      };

      let risk = 100 - breakdown.score;
      const reasons: string[] = [];

      const anomaly = anomalyMap.get(s.id);
      if (anomaly?.severity === "severe") {
        risk += 15;
        reasons.push("severe_attendance_anomaly");
      } else if (anomaly?.severity === "moderate") {
        risk += 10;
        reasons.push("moderate_attendance_anomaly");
      }

      // Failing last 2 exams
      const recentMarks = await tx.markEntry.findMany({
        where: {
          studentId: s.id,
          exam: { status: "PUBLISHED", deletedAt: null },
        },
        orderBy: { exam: { publishedAt: "desc" } },
        take: 2,
      });
      if (recentMarks.length === 2 && recentMarks.every((m) => m.isPassed === false)) {
        risk += 20;
        reasons.push("failing_recent_exams");
      }

      // Fee overdue > 30 days
      const overdueInstall = await tx.installment.findFirst({
        where: {
          studentFee: { studentId: s.id },
          status: "OVERDUE",
          dueDate: { lte: thirtyDaysAgo },
        },
      });
      if (overdueInstall) {
        risk += 10;
        reasons.push("fee_overdue_30d");
      }

      // Login inactive > 14 days
      const lastLogin = s.user.lastLoginAt;
      if (!lastLogin || differenceInDays(new Date(), lastLogin) > 14) {
        risk += 8;
        reasons.push("inactive_login_14d");
      }

      // No retest scheduled despite failing
      const pendingRetest = await tx.retest.findFirst({
        where: { studentId: s.id, status: "PENDING_SCHEDULE" },
      });
      if (pendingRetest) {
        risk += 12;
        reasons.push("no_retest_scheduled");
      }

      risk = Math.max(0, Math.min(100, Math.round(risk * 10) / 10));

      // Only include students with risk >= threshold (else noise)
      if (risk < 25 && reasons.length === 0) continue;

      results.push({
        studentId: s.id,
        studentName: s.user.name,
        batchId: s.batch?.id ?? null,
        batchName: s.batch?.name ?? null,
        riskScore: risk,
        topReasons: reasons.slice(0, 3),
        suggestedAction: pickAction(reasons),
        engagementScore: breakdown.score,
      });
    }

    return results.sort((a, b) => b.riskScore - a.riskScore).slice(0, limit);
  });
}
