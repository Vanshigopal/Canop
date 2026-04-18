import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/primitives";
import { formatIndianCurrency, formatIndianNumber } from "@/lib/indian-numbers";

const USD_TO_INR = 83;

export interface UsageData {
  currentMonth: string;
  total: {
    requests: number;
    inputTokens: number;
    outputTokens: number;
    costCents: number;
  };
  byFeature: { featureKey: string; requests: number; costCents: number }[];
  byStatus: { status: string; count: number }[];
  recent: {
    id: string;
    featureKey: string;
    model: string;
    status: string;
    inputTokens: number;
    outputTokens: number;
    estimatedCostCents: number;
    durationMs: number;
    errorCode: string | null;
    createdAt: string;
  }[];
  daily: { date: string; costCents: number }[];
}

interface UsageDashboardProps {
  data: UsageData | null;
  loading: boolean;
}

export function UsageDashboard({ data, loading }: UsageDashboardProps) {
  const chartData = useMemo(
    () =>
      (data?.daily ?? []).map((d) => ({
        date: d.date.slice(5),
        cost: (d.costCents / 100) * USD_TO_INR,
      })),
    [data?.daily],
  );

  if (loading) {
    return <div className="glass-panel p-8 text-center text-sm text-text-muted">Loading usage…</div>;
  }
  if (!data) {
    return (
      <div className="glass-panel p-8 text-center text-sm text-text-muted">
        No usage data for this month yet.
      </div>
    );
  }

  const totalInr = (data.total.costCents / 100) * USD_TO_INR;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total requests" value={formatIndianNumber(data.total.requests)} />
        <StatCard label="Input tokens" value={formatIndianNumber(data.total.inputTokens)} />
        <StatCard label="Output tokens" value={formatIndianNumber(data.total.outputTokens)} />
        <StatCard label="Total cost" value={formatIndianCurrency(totalInr)} />
      </div>

      {chartData.length > 0 && (
        <div className="glass-panel p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="text-sm font-semibold">Daily cost — {data.currentMonth}</h3>
            <span className="text-2xs text-text-muted font-mono uppercase tracking-wider">
              ₹ per day
            </span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  background: "rgba(255,255,255,0.95)",
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value: unknown) => formatIndianCurrency(typeof value === "number" ? value : 0)}
              />
              <Line type="monotone" dataKey="cost" stroke="#4F46E5" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {data.byFeature.length > 0 && (
        <div className="glass-panel p-5">
          <h3 className="text-sm font-semibold mb-3">By feature</h3>
          <table className="w-full text-sm">
            <thead className="text-2xs uppercase tracking-wider text-text-muted">
              <tr>
                <th className="text-left py-1.5 font-semibold">Feature</th>
                <th className="text-right py-1.5 font-semibold">Requests</th>
                <th className="text-right py-1.5 font-semibold">Cost</th>
                <th className="text-right py-1.5 font-semibold">% of total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-soft">
              {data.byFeature.map((f) => {
                const pct = data.total.costCents > 0 ? (f.costCents / data.total.costCents) * 100 : 0;
                return (
                  <tr key={f.featureKey}>
                    <td className="py-2 font-mono text-xs">{f.featureKey}</td>
                    <td className="py-2 text-right">{formatIndianNumber(f.requests)}</td>
                    <td className="py-2 text-right">
                      {formatIndianCurrency((f.costCents / 100) * USD_TO_INR)}
                    </td>
                    <td className="py-2 text-right text-text-muted">{pct.toFixed(0)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="glass-panel p-5">
        <h3 className="text-sm font-semibold mb-3">Recent activity</h3>
        {data.recent.length === 0 ? (
          <div className="text-sm text-text-muted py-4 text-center">No requests yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-2xs uppercase tracking-wider text-text-muted">
                <tr>
                  <th className="text-left py-1.5 font-semibold">Time</th>
                  <th className="text-left py-1.5 font-semibold">Feature</th>
                  <th className="text-left py-1.5 font-semibold">Status</th>
                  <th className="text-right py-1.5 font-semibold">In</th>
                  <th className="text-right py-1.5 font-semibold">Out</th>
                  <th className="text-right py-1.5 font-semibold">Cost</th>
                  <th className="text-right py-1.5 font-semibold">ms</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {data.recent.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 text-2xs font-mono text-text-muted">
                      {new Date(r.createdAt).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2 text-xs font-mono">{r.featureKey}</td>
                    <td className="py-2">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="py-2 text-right text-xs">{formatIndianNumber(r.inputTokens)}</td>
                    <td className="py-2 text-right text-xs">{formatIndianNumber(r.outputTokens)}</td>
                    <td className="py-2 text-right text-xs">
                      {r.estimatedCostCents === 0
                        ? "—"
                        : formatIndianCurrency((Number(r.estimatedCostCents) / 100) * USD_TO_INR)}
                    </td>
                    <td className="py-2 text-right text-2xs font-mono text-text-muted">
                      {r.durationMs}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-panel p-4">
      <div className="text-2xs font-mono uppercase tracking-wider text-text-muted">{label}</div>
      <div className="mt-1 text-xl font-display text-text-primary">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "SUCCESS"
      ? "success"
      : status === "STUBBED"
        ? "info"
        : status.startsWith("FAILED")
          ? "danger"
          : "neutral";
  const label =
    status === "SUCCESS" ? "Success" : status === "STUBBED" ? "Stub" : status.replace("FAILED_", "Err ");
  return <Badge tone={tone}>{label}</Badge>;
}
