import type { Prisma, Exam, MarkEntry } from "@prisma/client";
import { gradeFromPercent, trendFromDelta, type TrendDirection } from "./grading";

export type MarkInput = {
  studentId: string;
  marksObtained?: number | null;
  theoryMarks?: number | null;
  mcqCorrect?: number | null;
  mcqIncorrect?: number | null;
  mcqUnattempted?: number | null;
  isAbsent?: boolean;
  note?: string | null;
};

export interface ComputedMarks {
  marksObtained: number | null;
  theoryMarks: number | null;
  mcqCorrect: number | null;
  mcqIncorrect: number | null;
  mcqUnattempted: number | null;
  mcqPositiveMarks: number | null;
  mcqNegativeMarks: number | null;
  mcqNetMarks: number | null;
  isAbsent: boolean;
  validationError?: string;
}

function toNum(v: Prisma.Decimal | number | null | undefined): number | null {
  if (v == null) return null;
  if (typeof v === "number") return v;
  return Number(v);
}

export function computeMarks(exam: Exam, input: MarkInput): ComputedMarks {
  const base: ComputedMarks = {
    marksObtained: null,
    theoryMarks: null,
    mcqCorrect: null,
    mcqIncorrect: null,
    mcqUnattempted: null,
    mcqPositiveMarks: null,
    mcqNegativeMarks: null,
    mcqNetMarks: null,
    isAbsent: input.isAbsent === true,
  };

  if (base.isAbsent) return base;

  const totalMarks = Number(exam.totalMarks);

  if (exam.type === "THEORY" || exam.type === "OBJECTIVE" || exam.type === "NUMERICAL") {
    const m = input.marksObtained;
    if (m == null) {
      return { ...base, validationError: "marksObtained is required" };
    }
    if (m < 0 || m > totalMarks) {
      return { ...base, validationError: `Marks must be between 0 and ${totalMarks}` };
    }
    return { ...base, marksObtained: m };
  }

  if (exam.type === "MCQ") {
    const c = input.mcqCorrect;
    const w = input.mcqIncorrect;
    const u = input.mcqUnattempted;
    if (c == null || w == null || u == null) {
      return { ...base, validationError: "mcqCorrect, mcqIncorrect, mcqUnattempted all required" };
    }
    const totalQ = exam.totalQuestions ?? 0;
    if (c + w + u !== totalQ) {
      return {
        ...base,
        validationError: `Correct + Incorrect + Unattempted must equal ${totalQ}`,
      };
    }
    const perC = Number(exam.marksPerCorrect ?? 0);
    const perW = Number(exam.marksPerWrong ?? 0); // already negative
    const perU = Number(exam.marksPerUnattempted ?? 0);
    const pos = c * perC;
    const neg = w * perW;
    const unatt = u * perU;
    const net = pos + neg + unatt;
    return {
      ...base,
      mcqCorrect: c,
      mcqIncorrect: w,
      mcqUnattempted: u,
      mcqPositiveMarks: pos,
      mcqNegativeMarks: neg,
      mcqNetMarks: net,
      marksObtained: net,
    };
  }

  if (exam.type === "THEORY_MCQ") {
    const tm = input.theoryMarks;
    const c = input.mcqCorrect;
    const w = input.mcqIncorrect;
    const u = input.mcqUnattempted;
    if (tm == null || c == null || w == null || u == null) {
      return {
        ...base,
        validationError: "theoryMarks + mcqCorrect + mcqIncorrect + mcqUnattempted all required",
      };
    }
    const theoryMax = Number(exam.theoryMaxMarks ?? 0);
    const mcqMax = Number(exam.mcqMaxMarks ?? 0);
    const mcqQ = exam.mcqQuestionCount ?? exam.totalQuestions ?? 0;
    if (tm < 0 || tm > theoryMax) {
      return { ...base, validationError: `Theory marks must be 0..${theoryMax}` };
    }
    if (c + w + u !== mcqQ) {
      return { ...base, validationError: `Correct + Incorrect + Unattempted must equal ${mcqQ}` };
    }
    const perC = Number(exam.marksPerCorrect ?? 0);
    const perW = Number(exam.marksPerWrong ?? 0);
    const perU = Number(exam.marksPerUnattempted ?? 0);
    const pos = c * perC;
    const neg = w * perW;
    const unatt = u * perU;
    const net = pos + neg + unatt;
    if (net > mcqMax + 0.01) {
      return { ...base, validationError: `MCQ net score ${net} exceeds max ${mcqMax}` };
    }
    return {
      ...base,
      theoryMarks: tm,
      mcqCorrect: c,
      mcqIncorrect: w,
      mcqUnattempted: u,
      mcqPositiveMarks: pos,
      mcqNegativeMarks: neg,
      mcqNetMarks: net,
      marksObtained: tm + net,
    };
  }

  return { ...base, validationError: "Unknown exam type" };
}

export function evaluatePassFail(exam: Exam, marks: number, percentage: number): boolean {
  if (exam.cutOffType === "MARKS" && exam.passingMarks != null) {
    return marks >= Number(exam.passingMarks);
  }
  if (exam.cutOffType === "PERCENTAGE" && exam.passingPercent != null) {
    return percentage >= Number(exam.passingPercent);
  }
  return true;
}

export function pctOf(marks: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((marks / total) * 10000) / 100;
}

export function gradeFor(percentage: number): string {
  return gradeFromPercent(percentage);
}

/**
 * Computes ranks for a list of mark entries.
 * Same marksObtained → same rank (standard competition ranking).
 * Absent students are excluded from ranking.
 */
export function computeRanks(
  entries: Array<{ id: string; marksObtained: number | null; isAbsent: boolean }>,
): Map<string, number> {
  const ranked = entries
    .filter((e) => !e.isAbsent && e.marksObtained != null)
    .sort((a, b) => (b.marksObtained ?? 0) - (a.marksObtained ?? 0));
  const ranks = new Map<string, number>();
  let lastMarks = Number.NaN;
  let lastRank = 0;
  for (let i = 0; i < ranked.length; i++) {
    const e = ranked[i]!;
    const m = e.marksObtained ?? 0;
    if (m !== lastMarks) {
      lastRank = i + 1;
      lastMarks = m;
    }
    ranks.set(e.id, lastRank);
  }
  return ranks;
}

/**
 * Find the trend (up/down/stable) for a student's mark in a given exam, compared
 * to their most recent previous PUBLISHED exam in the same subject.
 * Returns null when this is the student's first exam in the subject.
 */
export async function computeTrendForStudent(
  prisma: Prisma.TransactionClient | import("@prisma/client").PrismaClient,
  args: {
    tenantId: string;
    studentId: string;
    currentExam: Exam;
    currentPercentage: number;
  },
): Promise<TrendDirection | null> {
  const { tenantId, studentId, currentExam, currentPercentage } = args;

  const prev = await prisma.markEntry.findFirst({
    where: {
      tenantId,
      studentId,
      exam: {
        tenantId,
        subjectId: currentExam.subjectId,
        status: "PUBLISHED",
        id: { not: currentExam.id },
        OR: [
          { examDate: { lt: currentExam.examDate ?? new Date() } },
          { examDate: null, publishedAt: { lt: currentExam.publishedAt ?? new Date() } },
        ],
      },
      isAbsent: false,
      percentage: { not: null },
    },
    orderBy: [{ exam: { examDate: "desc" } }, { exam: { publishedAt: "desc" } }],
  });

  if (!prev || prev.percentage == null) return null;
  return trendFromDelta(currentPercentage, Number(prev.percentage));
}

export function markEntryResponse(entry: MarkEntry): Record<string, unknown> {
  return {
    ...entry,
    marksObtained: toNum(entry.marksObtained),
    percentage: toNum(entry.percentage),
    theoryMarks: toNum(entry.theoryMarks),
    mcqPositiveMarks: toNum(entry.mcqPositiveMarks),
    mcqNegativeMarks: toNum(entry.mcqNegativeMarks),
    mcqNetMarks: toNum(entry.mcqNetMarks),
  };
}
