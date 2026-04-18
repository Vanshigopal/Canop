import { useCallback, useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { api } from "@/lib/api";
import { GradesView } from "./GradesView";

export function StudentGrades() {
  const [gradebook, setGradebook] = useState<GradebookData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/api/v1/student/gradebook");
      setGradebook(data.data);
    } catch {
      setGradebook(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useSocket("exam:published", load);
  useSocket("marks:published", load);
  useSocket("submission:graded", load);

  return <GradesView gradebook={gradebook} loading={loading} />;
}

export interface GradebookData {
  student: { id: string; name: string; batch: { id: string; name: string } | null };
  summary: {
    overallAverage: number;
    averageTrend: "up" | "down" | "stable" | null;
    examsTaken: number;
    bestSubject: { name: string; average: number } | null;
    batchRank: {
      current: number | null;
      previous: number | null;
      totalStudents: number;
    } | null;
    subjects: Array<{ name: string; average: number }>;
  };
  results: Array<{
    examId: string;
    examName: string;
    examType: string;
    examDate: string | null;
    subjectName: string;
    batchName: string;
    marksObtained: number | null;
    totalMarks: number;
    percentage: number | null;
    grade: string | null;
    batchRank: number | null;
    batchAverage: number;
    isPassed: boolean | null;
    isAbsent: boolean;
    trendDirection: "up" | "down" | "stable" | null;
    cutOff: { type: string; value: number };
    mcqBreakdown: null | {
      totalQuestions: number;
      correct: number;
      incorrect: number;
      unattempted: number;
      marksPerCorrect: number;
      marksPerWrong: number;
      positiveTotal: number;
      negativeTotal: number;
      netScore: number;
    };
    theoryMarks: number | null;
    retest: null | {
      retestId: string;
      status: string;
      scheduledDate: string | null;
      scheduledTime: string | null;
      retestMarks: number | null;
      retestPercentage: number | null;
      retestIsPassed: boolean | null;
    };
  }>;
}
