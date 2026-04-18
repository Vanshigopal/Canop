import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/primitives";
import { api } from "@/lib/api";

interface ExamSummary {
  examId: string;
  examName: string;
  subjectName: string;
  batchName: string;
  examDate: string | null;
  appeared: number;
  passRate: number;
  average: number;
  median: number;
  highest: number;
  lowest: number;
  stdDev: number;
}

interface SubjectComparison {
  subject: string;
  average: number;
  examCount: number;
  studentCount: number;
}

interface GradeDistribution {
  grade: string;
  count: number;
}

interface AcademicAnalyticsPayload {
  examSummaries: ExamSummary[];
  passRateEvolution: Array<{
    date: string | null;
    examName: string;
    passRate: number;
    average: number;
  }>;
  subjectComparison: SubjectComparison[];
  gradeDistribution: GradeDistribution[];
  totalExams: number;
  overallAverage: number;
}

export function AcademicAnalytics() {
  const [months, setMonths] = useState(6);

  const { data, isLoading } = useQuery<AcademicAnalyticsPayload>({
    queryKey: ["analytics-academic", months],
    queryFn: () =>
      api.get("/api/v1/analytics/academic", { params: { months } }).then((r) => r.data.data),
  });

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Link
          to="/analytics"
          className="flex items-center gap-1 text-sm text-text-muted hover:text-text-body"
        >
          <ArrowLeft size={14} /> Analytics
        </Link>
        <span className="text-text-muted">/</span>
        <h1 className="font-display text-2xl">Academic Analytics</h1>
      </div>

      <Card>
        <div className="flex flex-wrap gap-3">
          <div className="flex gap-1">
            {[3, 6, 12].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMonths(m)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  months === m
                    ? "bg-indigo text-white"
                    : "bg-bg-warm text-text-body hover:bg-bg-warm/70"
                }`}
              >
                Last {m} months
              </button>
            ))}
          </div>
          {data ? (
            <div className="ml-auto text-sm text-text-muted">
              {data.totalExams} exams · overall average{" "}
              {Math.round(data.overallAverage * 10) / 10}%
            </div>
          ) : null}
        </div>
      </Card>

      <Card>
        <h2 className="font-medium mb-3">Pass rate evolution</h2>
        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-text-muted text-sm">
            Loading…
          </div>
        ) : data && data.passRateEvolution.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.passRateEvolution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E3DA" />
              <XAxis dataKey="examName" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="passRate"
                stroke="#10B981"
                strokeWidth={2}
                name="Pass rate %"
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="average"
                stroke="#6366F1"
                strokeWidth={2}
                name="Average %"
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-text-muted text-sm">
            No published exams in this range
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h2 className="font-medium mb-3">Subject performance</h2>
          {data && data.subjectComparison.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.subjectComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E3DA" />
                <XAxis dataKey="subject" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="average" fill="#6366F1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-text-muted text-sm">No data</p>
          )}
        </Card>

        <Card>
          <h2 className="font-medium mb-3">Grade distribution</h2>
          {data && data.gradeDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.gradeDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E3DA" />
                <XAxis dataKey="grade" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-text-muted text-sm">No data</p>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="font-medium mb-3">Exam summary</h2>
        {data && data.examSummaries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-border-soft">
                  <th className="py-2 pr-3">Exam</th>
                  <th className="py-2 pr-3">Subject</th>
                  <th className="py-2 pr-3">Batch</th>
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3 text-right">Appeared</th>
                  <th className="py-2 pr-3 text-right">Avg %</th>
                  <th className="py-2 pr-3 text-right">Pass %</th>
                  <th className="py-2 pr-3 text-right">Std Dev</th>
                </tr>
              </thead>
              <tbody>
                {data.examSummaries.map((e) => (
                  <tr key={e.examId} className="border-b border-border-soft/40">
                    <td className="py-2 pr-3 font-medium">{e.examName}</td>
                    <td className="py-2 pr-3 text-text-muted">{e.subjectName}</td>
                    <td className="py-2 pr-3 text-text-muted">{e.batchName}</td>
                    <td className="py-2 pr-3 text-text-muted">{e.examDate || "—"}</td>
                    <td className="py-2 pr-3 text-right">{e.appeared}</td>
                    <td className="py-2 pr-3 text-right">{e.average}</td>
                    <td className="py-2 pr-3 text-right">{e.passRate}</td>
                    <td className="py-2 pr-3 text-right">{e.stdDev}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-text-muted text-sm">No exams to summarize</p>
        )}
      </Card>
    </div>
  );
}
