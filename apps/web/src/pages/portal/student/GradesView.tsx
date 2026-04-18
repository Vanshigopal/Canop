import { ChevronDown, ChevronUp, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Empty,
  PortalCard,
  PortalSkeleton,
  SectionHeader,
  severityColor,
} from "@/components/portal/PortalPrimitives";
import type { GradebookData } from "./StudentGrades";

interface Props {
  gradebook: GradebookData | null;
  loading: boolean;
}

export function GradesView({ gradebook, loading }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const chartData = useMemo(() => {
    if (!gradebook) return [];
    return [...gradebook.results]
      .filter((r) => !r.isAbsent && r.percentage != null)
      .reverse()
      .map((r, i) => ({
        name: r.examName.length > 10 ? `${r.examName.slice(0, 10)}…` : r.examName,
        percentage: r.percentage ?? 0,
        batchAverage: r.batchAverage,
        index: i + 1,
      }));
  }, [gradebook]);

  if (loading && !gradebook) {
    return (
      <div className="flex flex-col gap-4">
        <PortalSkeleton height={120} />
        <PortalSkeleton height={180} />
        <PortalSkeleton height={100} />
      </div>
    );
  }

  if (!gradebook || gradebook.results.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <SectionHeader title="Grades" />
        <Empty
          title="No published results yet"
          body="Results will appear here once your teacher publishes them."
        />
      </div>
    );
  }

  const trend = gradebook.summary.averageTrend;
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor =
    trend === "up" ? "#10B981" : trend === "down" ? "#DC2626" : "#6B7280";

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader title="Grades" />

      <PortalCard>
        <p
          className="text-[10px] uppercase tracking-[0.15em]"
          style={{ color: "#6B6A66", fontWeight: 600 }}
        >
          Overall average
        </p>
        <div className="flex items-center gap-3 mt-1">
          <span
            className="text-4xl font-semibold"
            style={{ color: severityColor(gradebook.summary.overallAverage) }}
          >
            {gradebook.summary.overallAverage.toFixed(1)}%
          </span>
          {trend && (
            <span
              className="flex items-center gap-1 text-xs font-semibold"
              style={{ color: trendColor }}
            >
              <TrendIcon size={14} strokeWidth={2.2} />
              {trend}
            </span>
          )}
        </div>
        <p className="text-xs mt-1" style={{ color: "#6B6A66" }}>
          {gradebook.summary.examsTaken} exams
          {gradebook.summary.batchRank?.current
            ? ` · Rank ${gradebook.summary.batchRank.current} of ${gradebook.summary.batchRank.totalStudents}`
            : ""}
        </p>

        {chartData.length > 1 && (
          <div className="mt-4 h-36 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="index" hide />
                <YAxis domain={[0, 100]} hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 253, 250, 0.96)",
                    border: "1px solid rgba(90, 70, 50, 0.1)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v) => `${Number(v).toFixed(1)}%`}
                />
                <Line
                  type="monotone"
                  dataKey="percentage"
                  stroke="#4F46E5"
                  strokeWidth={2.5}
                  dot={{ fill: "#4F46E5", r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="batchAverage"
                  stroke="#E8E3DA"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </PortalCard>

      {gradebook.summary.subjects.length > 0 && (
        <PortalCard>
          <p
            className="text-[10px] uppercase tracking-[0.15em] mb-3"
            style={{ color: "#6B6A66", fontWeight: 600 }}
          >
            Subjects
          </p>
          <div className="flex flex-col gap-2">
            {gradebook.summary.subjects.map((s) => (
              <div
                key={s.name}
                className="flex items-center justify-between py-1"
              >
                <span className="text-sm" style={{ color: "#2C2C2A" }}>
                  {s.name}
                </span>
                <span
                  className="text-sm font-semibold"
                  style={{ color: severityColor(s.average) }}
                >
                  {s.average.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </PortalCard>
      )}

      <section>
        <SectionHeader title="All exams" />
        <div className="flex flex-col gap-2">
          {gradebook.results.map((r) => {
            const isExpanded = expanded === r.examId;
            return (
              <PortalCard key={r.examId} padded={false} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpanded(isExpanded ? null : r.examId)}
                  className="w-full p-4 flex items-center gap-3 text-left transition-colors active:bg-black/5"
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: r.isAbsent
                        ? "#FEE2E2"
                        : `${severityColor(r.percentage ?? 0)}1F`,
                      color: r.isAbsent ? "#7F1D1D" : severityColor(r.percentage ?? 0),
                    }}
                  >
                    <span className="text-[11px] font-bold">
                      {r.isAbsent ? "ABS" : `${Math.round(r.percentage ?? 0)}%`}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "#2C2C2A" }}>
                      {r.examName}
                    </p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: "#6B6A66" }}>
                      {r.subjectName} · {r.marksObtained ?? 0}/{r.totalMarks}
                      {r.grade ? ` · ${r.grade}` : ""}
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp size={16} color="#6B6A66" />
                  ) : (
                    <ChevronDown size={16} color="#6B6A66" />
                  )}
                </button>
                {isExpanded && (
                  <div
                    className="px-4 pb-4 pt-2 border-t"
                    style={{ borderColor: "rgba(90, 70, 50, 0.08)" }}
                  >
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <Detail
                        label="Batch avg"
                        value={`${r.batchAverage.toFixed(1)}%`}
                      />
                      <Detail
                        label="Rank"
                        value={r.batchRank ? `${r.batchRank}` : "—"}
                      />
                      <Detail
                        label="Cut-off"
                        value={`${r.cutOff.value}${r.cutOff.type === "PERCENTAGE" ? "%" : ""}`}
                      />
                      <Detail
                        label="Status"
                        value={
                          r.isAbsent
                            ? "Absent"
                            : r.isPassed
                              ? "Passed"
                              : "Not passed"
                        }
                      />
                    </div>
                    {r.mcqBreakdown && (
                      <div
                        className="mt-3 pt-3 border-t grid grid-cols-3 gap-2 text-xs"
                        style={{ borderColor: "rgba(90, 70, 50, 0.08)" }}
                      >
                        <Detail label="Correct" value={String(r.mcqBreakdown.correct)} />
                        <Detail label="Wrong" value={String(r.mcqBreakdown.incorrect)} />
                        <Detail
                          label="Skipped"
                          value={String(r.mcqBreakdown.unattempted)}
                        />
                      </div>
                    )}
                    {r.retest && (
                      <div
                        className="mt-3 pt-3 border-t"
                        style={{ borderColor: "rgba(90, 70, 50, 0.08)" }}
                      >
                        <p
                          className="text-[10px] uppercase tracking-wider mb-1"
                          style={{ color: "#6B6A66", fontWeight: 600 }}
                        >
                          Retest
                        </p>
                        <p className="text-xs" style={{ color: "#2C2C2A" }}>
                          {r.retest.status}
                          {r.retest.retestMarks !== null
                            ? ` · ${r.retest.retestMarks}/${r.totalMarks}`
                            : ""}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </PortalCard>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider" style={{ color: "#6B6A66" }}>
        {label}
      </p>
      <p className="text-sm font-medium" style={{ color: "#2C2C2A" }}>
        {value}
      </p>
    </div>
  );
}
