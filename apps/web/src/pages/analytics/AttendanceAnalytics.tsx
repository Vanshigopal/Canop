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

interface DailyRate {
  date: string;
  rate: number;
  totalStudents: number;
  present: number;
}

interface BatchComparison {
  batchId: string;
  batchName: string;
  avgRate: number;
  sessionCount: number;
}

interface HeatmapCell {
  day: string;
  rate: number | null;
}

interface AttendanceAnalyticsPayload {
  dateRange: { from: string; to: string };
  summary: { mean: number; min: number; max: number; median: number } | null;
  dailyRates: DailyRate[];
  batchComparison: BatchComparison[] | null;
  heatmap: HeatmapCell[];
}

type Preset = "7" | "30" | "90";

export function AttendanceAnalytics() {
  const [preset, setPreset] = useState<Preset>("30");
  const [batchId, setBatchId] = useState<string>("");

  const { data: batches } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ["batches-list"],
    queryFn: () => api.get("/api/v1/batches").then((r) => r.data.data),
  });

  const { data, isLoading } = useQuery<AttendanceAnalyticsPayload>({
    queryKey: ["analytics-attendance", preset, batchId],
    queryFn: () => {
      const now = new Date();
      const dateTo = now.toISOString().slice(0, 10);
      const from = new Date(now);
      from.setDate(from.getDate() - Number(preset));
      const dateFrom = from.toISOString().slice(0, 10);
      return api
        .get("/api/v1/analytics/attendance", {
          params: { dateFrom, dateTo, batchId: batchId || undefined },
        })
        .then((r) => r.data.data);
    },
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
        <h1 className="font-display text-2xl">Attendance Analytics</h1>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1">
            {(["7", "30", "90"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPreset(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  preset === p
                    ? "bg-indigo text-white"
                    : "bg-bg-warm text-text-body hover:bg-bg-warm/70"
                }`}
              >
                Last {p} days
              </button>
            ))}
          </div>
          <select
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-bg-warm text-sm border border-border-soft"
          >
            <option value="">All batches</option>
            {batches?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card>
            <h2 className="font-medium mb-3">Daily attendance rate</h2>
            {isLoading ? (
              <div className="h-64 flex items-center justify-center text-text-muted text-sm">
                Loading…
              </div>
            ) : !data || data.dailyRates.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-text-muted text-sm">
                No attendance recorded in this range
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data.dailyRates}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E3DA" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="#6366F1"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
        <Card>
          <h2 className="font-medium mb-3">Summary</h2>
          {data?.summary ? (
            <div className="space-y-2 text-sm">
              <StatRow label="Average" value={`${Math.round(data.summary.mean * 10) / 10}%`} />
              <StatRow label="Median" value={`${Math.round(data.summary.median * 10) / 10}%`} />
              <StatRow label="Highest day" value={`${data.summary.max}%`} />
              <StatRow label="Lowest day" value={`${data.summary.min}%`} />
            </div>
          ) : (
            <p className="text-text-muted text-sm">No data</p>
          )}
        </Card>
      </div>

      {data && data.batchComparison && data.batchComparison.length > 0 && (
        <Card>
          <h2 className="font-medium mb-3">Batch comparison</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.batchComparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E3DA" />
              <XAxis dataKey="batchName" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="avgRate" fill="#6366F1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card>
        <h2 className="font-medium mb-3">Day-of-week heatmap</h2>
        <div className="grid grid-cols-7 gap-2">
          {data?.heatmap.map((cell) => {
            const rate = cell.rate ?? 0;
            const bg =
              cell.rate === null
                ? "#F1EFE8"
                : rate >= 90
                  ? "#10B981"
                  : rate >= 80
                    ? "#6366F1"
                    : rate >= 70
                      ? "#F59E0B"
                      : "#EF4444";
            return (
              <div
                key={cell.day}
                className="rounded-lg p-3 text-center text-white"
                style={{ background: bg, opacity: cell.rate === null ? 0.4 : 0.85 }}
              >
                <div className="text-xs uppercase tracking-wide">{cell.day}</div>
                <div className="text-lg font-semibold mt-1">
                  {cell.rate === null ? "—" : `${cell.rate}%`}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
