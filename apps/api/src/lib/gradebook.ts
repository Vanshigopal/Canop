import type { PrismaClient } from "@prisma/client";

function num(v: unknown): number | null {
  if (v == null) return null;
  return Number(v);
}

export async function studentGradebook(
  prisma: PrismaClient,
  args: { tenantId: string; studentId: string },
) {
  const { tenantId, studentId } = args;

  const student = await prisma.student.findFirst({
    where: { id: studentId, tenantId, deletedAt: null },
    include: {
      user: { select: { id: true, name: true } },
      batch: { select: { id: true, name: true } },
    },
  });
  if (!student) return null;

  const entries = await prisma.markEntry.findMany({
    where: {
      tenantId,
      studentId,
      exam: { status: "PUBLISHED", deletedAt: null },
    },
    include: {
      exam: {
        include: {
          subject: { select: { id: true, name: true } },
          batch: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [{ exam: { examDate: "desc" } }, { exam: { publishedAt: "desc" } }],
  });

  const examIds = entries.map((e) => e.examId);
  const averages = new Map<string, number>();
  if (examIds.length > 0) {
    const aggs = await prisma.markEntry.groupBy({
      by: ["examId"],
      where: { tenantId, examId: { in: examIds }, isAbsent: false, marksObtained: { not: null } },
      _avg: { marksObtained: true },
    });
    for (const a of aggs) {
      averages.set(a.examId, a._avg.marksObtained ? Number(a._avg.marksObtained) : 0);
    }
  }

  // Retest lookup for this student across all relevant exams
  const retests = examIds.length
    ? await prisma.retest.findMany({
        where: { tenantId, studentId, examId: { in: examIds } },
      })
    : [];
  const retestMap = new Map(retests.map((r) => [r.examId, r]));

  const results = entries.map((e) => {
    const exam = e.exam;
    const totalMarks = Number(exam.totalMarks);
    const avg = averages.get(e.examId) ?? 0;
    const cutOff = {
      type: exam.cutOffType,
      value:
        exam.cutOffType === "MARKS"
          ? (num(exam.passingMarks) ?? 0)
          : (num(exam.passingPercent) ?? 0),
    };
    const mcqBreakdown =
      exam.type === "MCQ" || exam.type === "THEORY_MCQ"
        ? {
            totalQuestions: exam.totalQuestions ?? exam.mcqQuestionCount ?? 0,
            correct: e.mcqCorrect ?? 0,
            incorrect: e.mcqIncorrect ?? 0,
            unattempted: e.mcqUnattempted ?? 0,
            marksPerCorrect: num(exam.marksPerCorrect) ?? 0,
            marksPerWrong: num(exam.marksPerWrong) ?? 0,
            positiveTotal: num(e.mcqPositiveMarks) ?? 0,
            negativeTotal: num(e.mcqNegativeMarks) ?? 0,
            netScore: num(e.mcqNetMarks) ?? 0,
          }
        : null;
    const r = retestMap.get(e.examId);
    const retest = r
      ? {
          retestId: r.id,
          status: r.status,
          scheduledDate: r.scheduledDate,
          scheduledTime: r.scheduledTime,
          retestMarks: num(r.retestMarks),
          retestPercentage: num(r.retestPercentage),
          retestIsPassed: r.retestIsPassed,
          originalMarks: num(r.originalMarks),
          originalPercentage: num(r.originalPercentage),
          attendedAt: r.attendedAt,
          retestTheoryMarks: num(r.retestTheoryMarks),
          retestMcqCorrect: r.retestMcqCorrect,
          retestMcqIncorrect: r.retestMcqIncorrect,
          retestMcqUnattempted: r.retestMcqUnattempted,
        }
      : null;

    return {
      examId: exam.id,
      examName: exam.name,
      examType: exam.type,
      examDate: exam.examDate,
      subjectName: exam.subject?.name ?? "All Subjects",
      batchName: exam.batch.name,
      marksObtained: num(e.marksObtained),
      totalMarks,
      percentage: num(e.percentage),
      grade: e.grade,
      batchRank: e.batchRank,
      batchAverage: Math.round(avg * 100) / 100,
      isPassed: e.isPassed,
      isAbsent: e.isAbsent,
      trendDirection: e.trendDirection,
      cutOff,
      mcqBreakdown,
      theoryMarks: num(e.theoryMarks),
      retest,
    };
  });

  const presentResults = results.filter((r) => !r.isAbsent && r.percentage != null);
  const overallAverage =
    presentResults.length > 0
      ? presentResults.reduce((s, r) => s + (r.percentage ?? 0), 0) / presentResults.length
      : 0;

  let averageTrend: "up" | "down" | "stable" | null = null;
  if (presentResults.length >= 2) {
    const half = Math.ceil(presentResults.length / 2);
    const newer = presentResults.slice(0, half);
    const older = presentResults.slice(half);
    const newerAvg = newer.reduce((s, r) => s + (r.percentage ?? 0), 0) / Math.max(newer.length, 1);
    const olderAvg = older.reduce((s, r) => s + (r.percentage ?? 0), 0) / Math.max(older.length, 1);
    const delta = newerAvg - olderAvg;
    averageTrend = delta > 2 ? "up" : delta < -2 ? "down" : "stable";
  }

  const bySubject = new Map<string, { name: string; total: number; count: number }>();
  for (const r of presentResults) {
    const cur = bySubject.get(r.subjectName) ?? { name: r.subjectName, total: 0, count: 0 };
    cur.total += r.percentage ?? 0;
    cur.count += 1;
    bySubject.set(r.subjectName, cur);
  }
  const subjects = Array.from(bySubject.values())
    .map((s) => ({
      name: s.name,
      average: Math.round((s.total / Math.max(s.count, 1)) * 100) / 100,
    }))
    .sort((a, b) => b.average - a.average);

  const best = subjects[0] ?? null;
  const latest = presentResults[0];
  const previous = presentResults[1];
  const batchRank = latest
    ? { current: latest.batchRank, previous: previous?.batchRank ?? null }
    : null;

  const totalStudents = student.batch
    ? await prisma.student.count({
        where: { tenantId, batchId: student.batch.id, deletedAt: null },
      })
    : 0;

  return {
    student: {
      id: student.id,
      name: student.user.name,
      batch: student.batch,
    },
    summary: {
      overallAverage: Math.round(overallAverage * 100) / 100,
      averageTrend,
      examsTaken: presentResults.length,
      bestSubject: best,
      batchRank: batchRank ? { ...batchRank, totalStudents } : null,
      subjects,
    },
    results,
  };
}
