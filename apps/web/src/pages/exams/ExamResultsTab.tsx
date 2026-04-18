import { Badge, Button } from "@/components/primitives";
import { api } from "@/lib/api";
import { Send, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ExamRow } from "./ExamsPage";

interface Analysis {
  exam: { id: string; name: string; type: string; totalMarks: number; status: string };
  stats: {
    totalStudents: number;
    appeared: number;
    absent: number;
    passed: number;
    failed: number;
    passRate: number;
    average: number;
    median: number;
    highest: { marks: number; studentName: string } | null;
    lowest: { marks: number; studentName: string } | null;
    standardDeviation: number;
  };
  distribution: Array<{ range: string; count: number }>;
  rankings: Array<{
    rank: number | null;
    studentId: string;
    studentName: string;
    marks: number;
    percentage: number | null;
  }>;
}

interface ExamResultRow {
  studentId: string;
  studentName: string;
  rollNumber: string | null;
  marksObtained: number | null;
  percentage: number | null;
  grade: string | null;
  batchRank: number | null;
  isPassed: boolean | null;
  isAbsent: boolean;
  trendDirection: "up" | "down" | "stable" | null;
}

export function ExamResultsTab({
  exams,
  onPublished,
  onRefresh,
}: {
  exams: ExamRow[];
  onPublished: () => void;
  onRefresh: () => void;
}) {
  const relevantExams = exams.filter((e) =>
    ["PUBLISHED", "UNDER_REVIEW", "MARKS_ENTRY"].includes(e.status),
  );
  const [selectedId, setSelectedId] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [entries, setEntries] = useState<ExamResultRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const selectedExam = relevantExams.find((e) => e.id === selectedId);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    Promise.all([
      api.get(`/api/v1/gradebook/exam/${selectedId}/analysis`),
      api.get(`/api/v1/gradebook/exam/${selectedId}`),
    ])
      .then(([a, e]) => {
        setAnalysis(a.data.data as Analysis);
        setEntries((e.data.data.entries as ExamResultRow[]) ?? []);
      })
      .catch(() => {
        setAnalysis(null);
        setEntries([]);
      })
      .finally(() => setLoading(false));
  }, [selectedId]);

  async function publish() {
    if (!selectedExam) return;
    setPublishing(true);
    try {
      await api.post(`/api/v1/exams/${selectedExam.id}/marks/publish`);
      onPublished();
      onRefresh();
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="text-sm rounded-md border border-border-soft bg-white/92 px-3 py-2 min-w-[260px]"
        >
          <option value="">— Select exam to see results —</option>
          {relevantExams.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} ({e.batch.name}) · {e.status}
            </option>
          ))}
        </select>
        {selectedExam &&
          (selectedExam.status === "UNDER_REVIEW" || selectedExam.status === "MARKS_ENTRY") && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Send size={14} />}
              onClick={publish}
              loading={publishing}
            >
              Publish results
            </Button>
          )}
      </div>

      {loading && <div className="text-xs text-text-dim">Loading...</div>}

      {analysis && !loading && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <Stat label="Appeared" value={String(analysis.stats.appeared)} />
            <Stat label="Absent" value={String(analysis.stats.absent)} />
            <Stat label="Pass rate" value={`${analysis.stats.passRate}%`} />
            <Stat label="Average" value={String(analysis.stats.average)} />
            <Stat label="Median" value={String(analysis.stats.median)} />
            <Stat label="Std Dev" value={String(analysis.stats.standardDeviation)} />
          </div>

          <div className="glass-panel p-5">
            <h3 className="font-display text-sm uppercase tracking-wider text-text-muted mb-3">
              Distribution
            </h3>
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <BarChart
                  data={analysis.distribution}
                  margin={{ top: 10, right: 10, bottom: 0, left: -10 }}
                >
                  <CartesianGrid stroke="transparent" />
                  <XAxis
                    dataKey="range"
                    tick={{ fontSize: 11, fill: "#6B6860", fontFamily: "Manrope, system-ui" }}
                    axisLine={{ stroke: "#E9E4D8" }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
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
                    cursor={{ fill: "rgba(0,0,0,0.02)" }}
                  />
                  <Bar dataKey="count" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-soft text-left text-text-dim">
                    <th className="px-4 py-2.5 font-medium">Rank</th>
                    <th className="px-4 py-2.5 font-medium">Student</th>
                    <th className="px-4 py-2.5 font-medium">Marks</th>
                    <th className="px-4 py-2.5 font-medium">%</th>
                    <th className="px-4 py-2.5 font-medium">Grade</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr
                      key={e.studentId}
                      className={`border-b border-border-soft last:border-0 ${
                        e.isPassed === false ? "bg-danger/5" : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-text-muted font-mono text-xs">
                        {e.isAbsent ? "—" : (e.batchRank ?? "—")}
                      </td>
                      <td className="px-4 py-3 text-text-primary">{e.studentName}</td>
                      <td className="px-4 py-3 text-text-primary">
                        {e.isAbsent ? "—" : `${e.marksObtained ?? 0}/${analysis.exam.totalMarks}`}
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {e.percentage == null ? "—" : `${e.percentage}%`}
                      </td>
                      <td className="px-4 py-3 text-text-muted">{e.grade ?? "—"}</td>
                      <td className="px-4 py-3">
                        {e.isAbsent ? (
                          <Badge tone="warning">Absent</Badge>
                        ) : e.isPassed ? (
                          <Badge tone="success">Pass</Badge>
                        ) : e.isPassed === false ? (
                          <Badge tone="danger">Fail</Badge>
                        ) : (
                          <span className="text-text-dim text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {e.trendDirection === "up" && (
                          <TrendingUp size={14} className="text-success" />
                        )}
                        {e.trendDirection === "down" && (
                          <TrendingDown size={14} className="text-danger" />
                        )}
                        {e.trendDirection === "stable" && (
                          <span className="text-text-dim text-xs">→</span>
                        )}
                        {e.trendDirection == null && (
                          <span className="text-text-dim text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-panel p-4">
      <div className="text-2xs uppercase tracking-wider text-text-dim">{label}</div>
      <div className="text-xl font-semibold text-text-primary mt-1">{value}</div>
    </div>
  );
}
