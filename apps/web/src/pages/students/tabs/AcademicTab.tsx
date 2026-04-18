import { Badge } from "@/components/primitives";
import { api } from "@/lib/api";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface McqBreakdown {
  totalQuestions: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  marksPerCorrect: number;
  marksPerWrong: number;
  positiveTotal: number;
  negativeTotal: number;
  netScore: number;
}

interface ResultRow {
  examId: string;
  examName: string;
  examType: "THEORY" | "MCQ" | "THEORY_MCQ" | "OBJECTIVE" | "NUMERICAL";
  examDate: string | null;
  subjectName: string;
  marksObtained: number | null;
  totalMarks: number;
  percentage: number | null;
  grade: string | null;
  batchRank: number | null;
  batchAverage: number;
  isPassed: boolean | null;
  isAbsent: boolean;
  trendDirection: "up" | "down" | "stable" | null;
  cutOff: { type: "MARKS" | "PERCENTAGE"; value: number };
  mcqBreakdown: McqBreakdown | null;
  theoryMarks: number | null;
  retest: null;
}

interface Gradebook {
  student: { id: string; name: string; batch: { id: string; name: string } | null };
  summary: {
    overallAverage: number;
    averageTrend: "up" | "down" | "stable" | null;
    examsTaken: number;
    bestSubject: { name: string; average: number } | null;
    batchRank: { current: number | null; previous: number | null; totalStudents: number } | null;
    subjects: Array<{ name: string; average: number }>;
  };
  results: ResultRow[];
}

export function AcademicTab({ studentId }: { studentId: string }) {
  const [gb, setGb] = useState<Gradebook | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    api
      .get(`/api/v1/gradebook/student/${studentId}`)
      .then((r) => setGb(r.data.data as Gradebook))
      .catch(() => setGb(null))
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) return <div className="text-text-dim text-sm">Loading academic data...</div>;
  if (!gb) return <div className="text-text-dim text-sm">Unable to load academic data.</div>;

  const presentResults = gb.results.filter((r) => !r.isAbsent && r.percentage != null);
  const trendData = [...presentResults].reverse().map((r) => ({
    exam: r.examName.length > 18 ? r.examName.slice(0, 18) + "…" : r.examName,
    student: r.percentage ?? 0,
    average: r.totalMarks > 0 ? Math.round((r.batchAverage / r.totalMarks) * 100) : 0,
  }));

  const subjectsChart = gb.summary.subjects.map((s) => ({ subject: s.name, avg: s.average }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Overall average"
          value={`${gb.summary.overallAverage}%`}
          trend={gb.summary.averageTrend}
        />
        <StatCard
          label="Best subject"
          value={
            gb.summary.bestSubject
              ? `${gb.summary.bestSubject.name} — ${gb.summary.bestSubject.average}%`
              : "—"
          }
        />
        <StatCard
          label="Batch rank"
          value={
            gb.summary.batchRank && gb.summary.batchRank.current != null
              ? `#${gb.summary.batchRank.current} / ${gb.summary.batchRank.totalStudents}`
              : "—"
          }
        />
        <StatCard label="Exams taken" value={String(gb.summary.examsTaken)} />
      </div>

      {trendData.length > 0 && (
        <div className="glass-panel p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-sm uppercase tracking-wider text-text-muted">
              Marks trend
            </h3>
            <span className="text-2xs text-text-dim">Compared to batch average</span>
          </div>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <ComposedChart data={trendData} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="studentFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#4F46E5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="transparent" />
                <XAxis
                  dataKey="exam"
                  tick={{ fontSize: 11, fill: "#6B6860", fontFamily: "Manrope, system-ui" }}
                  axisLine={{ stroke: "#E9E4D8" }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: "#6B6860", fontFamily: "Manrope, system-ui" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(255,255,255,0.95)",
                    border: "1px solid #E9E4D8",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  cursor={{ stroke: "#E9E4D8", strokeWidth: 1 }}
                />
                <Area
                  type="monotone"
                  dataKey="student"
                  stroke="#4F46E5"
                  strokeWidth={2.5}
                  fill="url(#studentFill)"
                  name="Student"
                  dot={{ fill: "#4F46E5", r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="average"
                  stroke="#EC4899"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  dot={false}
                  name="Batch average"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {subjectsChart.length > 0 && (
        <div className="glass-panel p-5">
          <h3 className="font-display text-sm uppercase tracking-wider text-text-muted mb-4">
            Subject-wise performance
          </h3>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <BarChart
                layout="vertical"
                data={subjectsChart}
                margin={{ top: 5, right: 20, bottom: 5, left: 20 }}
              >
                <CartesianGrid stroke="transparent" />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: "#6B6860", fontFamily: "Manrope, system-ui" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="subject"
                  width={100}
                  tick={{ fontSize: 12, fill: "#2B2B2E", fontFamily: "Manrope, system-ui" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(255,255,255,0.95)",
                    border: "1px solid #E9E4D8",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  cursor={{ fill: "rgba(0,0,0,0.02)" }}
                  formatter={(v) => [`${v}%`, "Average"]}
                />
                <Bar dataKey="avg" radius={[0, 6, 6, 0]}>
                  {subjectsChart.map((s) => {
                    const color = s.avg >= 75 ? "#059669" : s.avg >= 50 ? "#D97706" : "#DC2626";
                    return <Cell key={s.subject} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="glass-panel overflow-hidden">
        <div className="px-4 py-3 border-b border-border-soft flex items-center justify-between">
          <h3 className="font-display text-sm uppercase tracking-wider text-text-muted">
            Exam results
          </h3>
          <span className="text-2xs text-text-dim">{gb.results.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-soft text-left text-text-dim">
                <th className="px-4 py-2.5 font-medium">Exam</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium">Marks</th>
                <th className="px-4 py-2.5 font-medium">%</th>
                <th className="px-4 py-2.5 font-medium">Grade</th>
                <th className="px-4 py-2.5 font-medium">Rank</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Retest</th>
              </tr>
            </thead>
            <tbody>
              {gb.results.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-text-dim text-xs">
                    No exam results yet.
                  </td>
                </tr>
              )}
              {gb.results.map((row) => (
                <tr
                  key={row.examId}
                  className={`border-b border-border-soft last:border-0 ${
                    row.isPassed === false ? "bg-danger/5" : ""
                  }`}
                >
                  <td className="px-4 py-3 text-text-primary">
                    {row.examName}
                    {row.mcqBreakdown && (
                      <div className="text-2xs text-text-dim mt-0.5 font-mono">
                        {row.mcqBreakdown.correct}✓ / {row.mcqBreakdown.incorrect}✗ /{" "}
                        {row.mcqBreakdown.unattempted}−
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {row.subjectName}
                    <div className="text-2xs text-text-dim">{row.examType.replace("_", " + ")}</div>
                  </td>
                  <td className="px-4 py-3 text-text-muted font-mono text-xs">
                    {row.examDate ? row.examDate.slice(0, 10) : "—"}
                  </td>
                  <td className="px-4 py-3 text-text-primary">
                    {row.isAbsent ? "—" : `${row.marksObtained ?? 0} / ${row.totalMarks}`}
                  </td>
                  <td className="px-4 py-3 text-text-primary font-medium">
                    <span className="inline-flex items-center gap-1">
                      {row.percentage == null ? "—" : `${row.percentage}%`}
                      {row.trendDirection === "up" && (
                        <TrendingUp size={12} className="text-success" />
                      )}
                      {row.trendDirection === "down" && (
                        <TrendingDown size={12} className="text-danger" />
                      )}
                      {row.trendDirection === "stable" && (
                        <span className="text-text-dim text-2xs">→</span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{row.grade ?? "—"}</td>
                  <td className="px-4 py-3 text-text-muted font-mono text-xs">
                    {row.batchRank ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {row.isAbsent ? (
                      <Badge tone="warning">Absent</Badge>
                    ) : row.isPassed ? (
                      <Badge tone="success">Pass</Badge>
                    ) : row.isPassed === false ? (
                      <Badge tone="danger">Fail</Badge>
                    ) : (
                      <span className="text-text-dim text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-dim">—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend?: "up" | "down" | "stable" | null;
}) {
  return (
    <div className="glass-panel p-4">
      <div className="text-2xs uppercase tracking-wider text-text-dim">{label}</div>
      <div className="flex items-baseline gap-2 mt-1">
        <div className="text-xl font-semibold text-text-primary">{value}</div>
        {trend === "up" && <TrendingUp size={14} className="text-success" />}
        {trend === "down" && <TrendingDown size={14} className="text-danger" />}
      </div>
    </div>
  );
}
