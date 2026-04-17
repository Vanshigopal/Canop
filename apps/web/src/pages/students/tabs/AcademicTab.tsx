import { Badge } from "@/components/primitives";
import { TrendingUp } from "lucide-react";
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

// TODO: Session 9 — wire to real exam data
const sampleMarksTrend = [
  { exam: "Unit 1", student: 72, average: 65 },
  { exam: "Unit 2", student: 78, average: 68 },
  { exam: "Midterm", student: 81, average: 70 },
  { exam: "Unit 3", student: 74, average: 69 },
  { exam: "Unit 4", student: 85, average: 72 },
  { exam: "Prelims", student: 88, average: 74 },
  { exam: "Mock", student: 82, average: 73 },
  { exam: "Final", student: 89, average: 76 },
];

const sampleSubjects = [
  { subject: "Biology", avg: 89 },
  { subject: "Chemistry", avg: 76 },
  { subject: "Physics", avg: 71 },
  { subject: "Mathematics", avg: 58 },
];

interface ExamRow {
  exam: string;
  type: "Unit Test" | "Mid-term" | "Final" | "Prelims";
  date: string;
  marks: number;
  total: number;
  cutoff: number;
  status: "PASS" | "FAIL";
  retest: number | "Pending" | "—";
}

const sampleExamResults: ExamRow[] = [
  { exam: "Unit 1 — Cell Biology", type: "Unit Test", date: "2026-01-14", marks: 72, total: 100, cutoff: 40, status: "PASS", retest: "—" },
  { exam: "Unit 2 — Bonding", type: "Unit Test", date: "2026-01-28", marks: 38, total: 100, cutoff: 40, status: "FAIL", retest: 62 },
  { exam: "Midterm — All subjects", type: "Mid-term", date: "2026-02-20", marks: 405, total: 500, cutoff: 200, status: "PASS", retest: "—" },
  { exam: "Unit 3 — Kinematics", type: "Unit Test", date: "2026-03-04", marks: 37, total: 100, cutoff: 40, status: "FAIL", retest: "Pending" },
  { exam: "Unit 4 — Organic", type: "Unit Test", date: "2026-03-18", marks: 85, total: 100, cutoff: 40, status: "PASS", retest: "—" },
  { exam: "Prelims", type: "Prelims", date: "2026-04-02", marks: 440, total: 500, cutoff: 250, status: "PASS", retest: "—" },
];

export function AcademicTab() {
  const overallAvg =
    sampleMarksTrend.reduce((sum, e) => sum + e.student, 0) / sampleMarksTrend.length;
  const bestSubject = sampleSubjects.reduce((a, b) => (a.avg > b.avg ? a : b));

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Overall Average" value={`${overallAvg.toFixed(1)}%`} trend="+3.2%" />
        <StatCard label="Best Subject" value={`${bestSubject.subject} — ${bestSubject.avg}%`} />
        <StatCard label="Batch Rank" value="#7 / 34" />
        <StatCard label="Exams Taken" value={String(sampleExamResults.length)} />
      </div>

      {/* Marks trend */}
      <div className="glass-panel p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-sm uppercase tracking-wider text-text-muted">
            Marks trend
          </h3>
          <span className="text-2xs text-text-dim inline-flex items-center gap-1">
            <TrendingUp size={12} /> Compared to batch average
          </span>
        </div>
        <div style={{ width: "100%", height: 240 }}>
          <ResponsiveContainer>
            <ComposedChart data={sampleMarksTrend} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
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

      {/* Subject-wise */}
      <div className="glass-panel p-5">
        <h3 className="font-display text-sm uppercase tracking-wider text-text-muted mb-4">
          Subject-wise performance
        </h3>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <BarChart
              layout="vertical"
              data={sampleSubjects}
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
                width={90}
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
                {sampleSubjects.map((s) => {
                  const color = s.avg >= 75 ? "#059669" : s.avg >= 50 ? "#D97706" : "#DC2626";
                  return <Cell key={s.subject} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Exam results table */}
      <div className="glass-panel overflow-hidden">
        <div className="px-4 py-3 border-b border-border-soft flex items-center justify-between">
          <h3 className="font-display text-sm uppercase tracking-wider text-text-muted">
            Exam results
          </h3>
          <span className="text-2xs text-text-dim">{sampleExamResults.length} records</span>
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
                <th className="px-4 py-2.5 font-medium">Cut-off</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Retest</th>
              </tr>
            </thead>
            <tbody>
              {sampleExamResults.map((row) => {
                const pct = Math.round((row.marks / row.total) * 100);
                return (
                  <tr key={row.exam} className="border-b border-border-soft last:border-0">
                    <td className="px-4 py-3 text-text-primary">{row.exam}</td>
                    <td className="px-4 py-3 text-text-muted">{row.type}</td>
                    <td className="px-4 py-3 text-text-muted font-mono text-xs">{row.date}</td>
                    <td className="px-4 py-3 text-text-primary">
                      {row.marks} / {row.total}
                    </td>
                    <td className="px-4 py-3 text-text-primary font-medium">{pct}%</td>
                    <td className="px-4 py-3 text-text-muted">
                      {Math.round((row.cutoff / row.total) * 100)}%
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={row.status === "PASS" ? "success" : "danger"}>
                        {row.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {typeof row.retest === "number" ? (
                        <span className="text-success">
                          {row.retest} / {row.total}
                        </span>
                      ) : row.retest === "Pending" ? (
                        <Badge tone="warning">Pending</Badge>
                      ) : (
                        <span className="text-text-dim">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-border-soft text-2xs text-text-dim">
          Sample data — will be wired to real exams in Session 9.
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, trend }: { label: string; value: string; trend?: string }) {
  return (
    <div className="glass-panel p-4">
      <div className="text-2xs uppercase tracking-wider text-text-dim">{label}</div>
      <div className="flex items-baseline gap-2 mt-1">
        <div className="text-xl font-semibold text-text-primary">{value}</div>
        {trend && <div className="text-2xs text-success font-medium">{trend}</div>}
      </div>
    </div>
  );
}

