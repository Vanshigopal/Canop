import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge, Card } from "@/components/primitives";
import { api } from "@/lib/api";

interface EngagementPayload {
  scoreStats: { mean: number; min: number; max: number; median: number } | null;
  scoreDistribution: Array<{ rangeStart: number; rangeEnd: number; count: number }>;
  riskLevels: {
    excellent: number;
    good: number;
    neutral: number;
    warning: number;
    critical: number;
  };
  engagementTrend: Array<{ date: string; avgScore: number; studentCount: number }>;
  contentConsumption: {
    videosWatched: number;
    materialsDownloaded: number;
    assignmentsSubmitted: number;
  };
  topEngaged: Array<{ studentId: string; studentName: string; batchName?: string; score: number }>;
  leastEngaged: Array<{
    studentId: string;
    studentName: string;
    batchName?: string;
    score: number;
    riskFactors: string[];
  }>;
}

const RISK_COLORS: Record<keyof EngagementPayload["riskLevels"], string> = {
  excellent: "#10B981",
  good: "#6366F1",
  neutral: "#94A3B8",
  warning: "#F59E0B",
  critical: "#EF4444",
};

export function EngagementAnalytics() {
  const [days, setDays] = useState(30);

  const { data, isLoading } = useQuery<EngagementPayload>({
    queryKey: ["analytics-engagement", days],
    queryFn: () =>
      api.get("/api/v1/analytics/engagement", { params: { days } }).then((r) => r.data.data),
  });

  const riskData = data
    ? Object.entries(data.riskLevels).map(([level, count]) => ({
        level,
        count,
      }))
    : [];

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
        <h1 className="font-display text-2xl">Engagement Analytics</h1>
      </div>

      <Card>
        <div className="flex gap-1">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                days === d
                  ? "bg-indigo text-white"
                  : "bg-bg-warm text-text-body hover:bg-bg-warm/70"
              }`}
            >
              Last {d} days
            </button>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card>
            <h2 className="font-medium mb-3">Score distribution</h2>
            {isLoading ? (
              <div className="h-48 flex items-center justify-center text-text-muted text-sm">
                Loading…
              </div>
            ) : data && data.scoreDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={data.scoreDistribution.map((b) => ({
                    range: `${Math.round(b.rangeStart)}-${Math.round(b.rangeEnd)}`,
                    count: b.count,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E3DA" />
                  <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-text-muted text-sm">No engagement data yet</p>
            )}
          </Card>
        </div>
        <Card>
          <h2 className="font-medium mb-3">Risk levels</h2>
          {data && riskData.some((r) => r.count > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={riskData.filter((r) => r.count > 0)}
                  dataKey="count"
                  nameKey="level"
                  outerRadius={80}
                  label={(entry: unknown) => {
                    const e = entry as { level: string; count: number };
                    return `${e.level}: ${e.count}`;
                  }}
                >
                  {riskData
                    .filter((r) => r.count > 0)
                    .map((r) => (
                      <Cell
                        key={r.level}
                        fill={RISK_COLORS[r.level as keyof typeof RISK_COLORS]}
                      />
                    ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-text-muted text-sm">No snapshots</p>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="font-medium mb-3">Engagement trend</h2>
        {data && data.engagementTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.engagementTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E3DA" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="avgScore"
                stroke="#10B981"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-text-muted text-sm">No trend data</p>
        )}
      </Card>

      <Card>
        <h2 className="font-medium mb-3">Content consumption</h2>
        {data ? (
          <div className="grid grid-cols-3 gap-4">
            <StatBlock
              label="Videos watched"
              value={data.contentConsumption.videosWatched}
              icon={Sparkles}
            />
            <StatBlock
              label="Materials downloaded"
              value={data.contentConsumption.materialsDownloaded}
              icon={Sparkles}
            />
            <StatBlock
              label="Assignments submitted"
              value={data.contentConsumption.assignmentsSubmitted}
              icon={Sparkles}
            />
          </div>
        ) : null}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h2 className="font-medium mb-3 flex items-center gap-2">
            <TrendingUp size={16} className="text-success" /> Top engaged
          </h2>
          {data && data.topEngaged.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {data.topEngaged.map((s) => (
                <li key={s.studentId} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{s.studentName}</div>
                    <div className="text-xs text-text-muted">{s.batchName}</div>
                  </div>
                  <Badge tone="success">{Math.round(s.score)}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-text-muted text-sm">No data</p>
          )}
        </Card>

        <Card>
          <h2 className="font-medium mb-3 flex items-center gap-2">
            <TrendingDown size={16} className="text-danger" /> Least engaged
          </h2>
          {data && data.leastEngaged.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {data.leastEngaged.map((s) => (
                <li key={s.studentId} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{s.studentName}</div>
                    <div className="text-xs text-text-muted">{s.batchName}</div>
                  </div>
                  <Badge tone="danger">{Math.round(s.score)}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-text-muted text-sm">No data</p>
          )}
        </Card>
      </div>
    </div>
  );
}

function StatBlock({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Sparkles;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg bg-indigo/10">
        <Icon size={16} className="text-indigo" />
      </div>
      <div>
        <div className="text-xs text-text-muted">{label}</div>
        <div className="text-xl font-semibold">{value}</div>
      </div>
    </div>
  );
}
