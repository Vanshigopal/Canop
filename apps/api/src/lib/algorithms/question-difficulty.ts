import { prisma, withTenantTransaction } from "@/config/db";

/**
 * E3 — Question difficulty calibration.
 *
 * Session 10A lays the API groundwork. Per-question OMR response data lands in 10B.
 * For now, returns { available: false } so the UI can render a placeholder.
 */
export interface QuestionStats {
  questionNumber: number;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  difficulty: number;
  discrimination: number;
}

export interface QuestionStatsResult {
  available: boolean;
  reason?: string;
  questions?: QuestionStats[];
  totalResponses?: number;
}

export async function getQuestionStats(
  tenantId: string,
  examId: string,
): Promise<QuestionStatsResult> {
  return withTenantTransaction(prisma, tenantId, async (tx) => {
    const exam = await tx.exam.findFirst({
      where: { id: examId, deletedAt: null },
    });
    if (!exam) return { available: false, reason: "exam_not_found" };
    if (exam.type !== "MCQ" && exam.type !== "THEORY_MCQ") {
      return { available: false, reason: "not_mcq_exam" };
    }
    return {
      available: false,
      reason: "omr_data_pending",
    };
  });
}
