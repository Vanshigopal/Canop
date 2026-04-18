import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Badge, Card } from "@/components/primitives";
import { api } from "@/lib/api";

interface BatchMetrics {
  id: string;
  name: string;
  studentCount: number;
  attendanceRate: number;
  examAverage: number;
  passRate: number;
  collectionRate: number;
  avgEngagement: number;
}

interface BatchComparisonPayload {
  batchA: BatchMetrics;
  batchB: BatchMetrics;
  examDiffSignificant: boolean;
  examDiffPValue: number;
}

export function BatchComparisonPage() {
  const [batchIdA, setBatchIdA] = useState("");
  const [batchIdB, setBatchIdB] = useState("");

  const { data: batches } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ["batches-list"],
    queryFn: () => api.get("/api/v1/batches").then((r) => r.data.data),
  });

  const canRun = batchIdA && batchIdB && batchIdA !== batchIdB;

  const { data, isFetching } = useQuery<BatchComparisonPayload>({
    queryKey: ["analytics-compare", batchIdA, batchIdB],
    queryFn: () =>
      api
        .get("/api/v1/analytics/batch-comparison", {
          params: { batchIdA, batchIdB },
        })
        .then((r) => r.data.data),
    enabled: Boolean(canRun),
  });

  const radarData = data
    ? [
        { metric: "Attendance", A: data.batchA.attendanceRate, B: data.batchB.attendanceRate },
        { metric: "Exam Avg", A: data.batchA.examAverage, B: data.batchB.examAverage },
        { metric: "Pass Rate", A: data.batchA.passRate, B: data.batchB.passRate },
        {
          metric: "Collection",
          A: data.batchA.collectionRate,
          B: data.batchB.collectionRate,
        },
        { metric: "Engagement", A: data.batchA.avgEngagement, B: data.batchB.avgEngagement },
      ]
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
        <h1 className="font-display text-2xl">Batch Comparison</h1>
      </div>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-text-muted block mb-1">Batch A</label>
            <select
              value={batchIdA}
              onChange={(e) => setBatchIdA(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-bg-warm text-sm border border-border-soft"
            >
              <option value="">Select batch…</option>
              {batches?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-text-muted block mb-1">Batch B</label>
            <select
              value={batchIdB}
              onChange={(e) => setBatchIdB(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-bg-warm text-sm border border-border-soft"
            >
              <option value="">Select batch…</option>
              {batches?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {!canRun && (
        <Card>
          <p className="text-text-muted text-sm">Pick two different batches to compare.</p>
        </Card>
      )}

      {canRun && isFetching && (
        <Card>
          <p className="text-text-muted text-sm">Loading…</p>
        </Card>
      )}

      {data && (
        <>
          <Card>
            <h2 className="font-medium mb-3">Radar comparison</h2>
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#E8E3DA" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar
                  name={data.batchA.name}
                  dataKey="A"
                  stroke="#6366F1"
                  fill="#6366F1"
                  fillOpacity={0.3}
                />
                <Radar
                  name={data.batchB.name}
                  dataKey="B"
                  stroke="#F59E0B"
                  fill="#F59E0B"
                  fillOpacity={0.3}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm">
                <div className="font-medium">Statistical significance</div>
                <p className="text-text-muted mt-1">
                  Exam performance difference is{" "}
                  {data.examDiffSignificant ? (
                    <Badge tone="warning">significant</Badge>
                  ) : (
                    <Badge tone="neutral">not significant</Badge>
                  )}{" "}
                  at p={data.examDiffPValue}.
                </p>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BatchMetricsCard metrics={data.batchA} accent="indigo" />
            <BatchMetricsCard metrics={data.batchB} accent="amber" />
          </div>
        </>
      )}
    </div>
  );
}

function BatchMetricsCard({
  metrics,
  accent,
}: {
  metrics: BatchMetrics;
  accent: "indigo" | "amber";
}) {
  const color = accent === "indigo" ? "#6366F1" : "#F59E0B";
  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <span className="w-3 h-3 rounded-full" style={{ background: color }} />
        <h2 className="font-medium">{metrics.name}</h2>
      </div>
      <dl className="space-y-1.5 text-sm">
        <Row label="Students" value={metrics.studentCount} />
        <Row label="Attendance rate" value={`${metrics.attendanceRate}%`} />
        <Row label="Exam average" value={`${metrics.examAverage}%`} />
        <Row label="Pass rate" value={`${metrics.passRate}%`} />
        <Row label="Collection rate" value={`${metrics.collectionRate}%`} />
        <Row label="Engagement" value={metrics.avgEngagement} />
      </dl>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex justify-between">
      <span className="text-text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
