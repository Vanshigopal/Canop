import { prisma, withTenantTransaction } from "@/config/db";
import { percentileRank } from "./stats-util";

/**
 * D3 — Subject strength profile.
 *
 * Per subject (for exams the student has taken):
 *   - Student average %, batch average %, percentile rank
 *   - Classification: strong (top 25), above_average (25-50), average (50-75), weak (bottom 25)
 */
export interface SubjectStrength {
  subjectId: string;
  subjectName: string;
  studentAverage: number;
  batchAverage: number;
  percentileRank: number;
  classification: "strong" | "above_average" | "average" | "weak";
  examCount: number;
}

function classify(rank: number): SubjectStrength["classification"] {
  if (rank >= 75) return "strong";
  if (rank >= 50) return "above_average";
  if (rank >= 25) return "average";
  return "weak";
}

export async function computeSubjectStrength(
  tenantId: string,
  studentId: string,
): Promise<SubjectStrength[]> {
  return withTenantTransaction(prisma, tenantId, async (tx) => {
    const student = await tx.student.findFirst({
      where: { id: studentId, deletedAt: null },
    });
    if (!student?.batchId) return [];

    const marks = await tx.markEntry.findMany({
      where: {
        studentId,
        isAbsent: false,
        percentage: { not: null },
        exam: { status: "PUBLISHED", deletedAt: null, subjectId: { not: null } },
      },
      include: {
        exam: {
          include: { subject: true },
        },
      },
    });

    if (marks.length === 0) return [];

    // Group by subject
    const bySubject = new Map<string, { name: string; percents: number[] }>();
    for (const m of marks) {
      if (!m.exam.subject) continue;
      const key = m.exam.subject.id;
      const entry = bySubject.get(key) || { name: m.exam.subject.name, percents: [] };
      entry.percents.push(Number(m.percentage));
      bySubject.set(key, entry);
    }

    const results: SubjectStrength[] = [];
    for (const [subjectId, info] of bySubject) {
      const studentAverage =
        info.percents.reduce((a, b) => a + b, 0) / info.percents.length;

      // Batch average: average % of all students in student's batch for this subject
      const batchMarks = await tx.markEntry.findMany({
        where: {
          isAbsent: false,
          percentage: { not: null },
          exam: {
            subjectId,
            batchId: student.batchId,
            status: "PUBLISHED",
            deletedAt: null,
          },
        },
        select: { studentId: true, percentage: true },
      });

      // Per-student average for batch, then overall mean
      const byStudent = new Map<string, number[]>();
      for (const b of batchMarks) {
        const arr = byStudent.get(b.studentId) || [];
        arr.push(Number(b.percentage));
        byStudent.set(b.studentId, arr);
      }
      const perStudentAverages = Array.from(byStudent.values()).map(
        (arr) => arr.reduce((a, b) => a + b, 0) / arr.length,
      );
      const batchAverage =
        perStudentAverages.length > 0
          ? perStudentAverages.reduce((a, b) => a + b, 0) / perStudentAverages.length
          : 0;

      const rank = percentileRank(studentAverage, perStudentAverages);

      results.push({
        subjectId,
        subjectName: info.name,
        studentAverage: Math.round(studentAverage * 10) / 10,
        batchAverage: Math.round(batchAverage * 10) / 10,
        percentileRank: Math.round(rank * 10) / 10,
        classification: classify(rank),
        examCount: info.percents.length,
      });
    }

    return results.sort((a, b) => b.percentileRank - a.percentileRank);
  });
}
