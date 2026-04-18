import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Card } from "@/components/primitives";
import { api } from "@/lib/api";
import { formatIndianCurrency } from "@/lib/indian-numbers";

interface FinancialPayload {
  summary: {
    expected: number;
    collected: number;
    collectionRate: number;
    overdueAmount: number;
    overdueCount: number;
  };
  collectionTrend: Array<{ month: string; amount: number }>;
  agingBuckets: Array<{ label: string; amount: number; count: number }>;
  methodBreakdown: Array<{ method: string; amount: number; count: number }>;
  nextMonthForecast: number;
}

const AGING_COLORS = ["#10B981", "#6366F1", "#F59E0B", "#F97316", "#EF4444"];

export function FinancialAnalytics() {
  const [months, setMonths] = useState(6);

  const { data, isLoading } = useQuery<FinancialPayload>({
    queryKey: ["analytics-financial", months],
    queryFn: () =>
      api.get("/api/v1/analytics/financial", { params: { months } }).then((r) => r.data.data),
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
        <h1 className="font-display text-2xl">Financial Analytics</h1>
      </div>

      <Card>
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
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          title="Expected"
          value={data ? formatIndianCurrency(data.summary.expected, true) : "—"}
          isLoading={isLoading}
        />
        <SummaryCard
          title="Collected"
          value={data ? formatIndianCurrency(data.summary.collected, true) : "—"}
          isLoading={isLoading}
        />
        <SummaryCard
          title="Collection rate"
          value={data ? `${data.summary.collectionRate}%` : "—"}
          highlight
          isLoading={isLoading}
        />
        <SummaryCard
          title="Overdue"
          value={
            data
              ? `${formatIndianCurrency(data.summary.overdueAmount, true)} · ${data.summary.overdueCount}`
              : "—"
          }
          danger
          isLoading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card>
            <h2 className="font-medium mb-3">Monthly collection trend</h2>
            {data && data.collectionTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.collectionTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E3DA" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => formatIndianCurrency(Number(value))} />
                  <Bar dataKey="amount" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-text-muted text-sm">
                No payments yet
              </div>
            )}
          </Card>
        </div>

        <Card>
          <h2 className="font-medium mb-3">Overdue aging</h2>
          {data && data.agingBuckets.some((b) => b.count > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data.agingBuckets.filter((b) => b.count > 0)}
                  dataKey="amount"
                  nameKey="label"
                  outerRadius={80}
                  label={(entry: unknown) => {
                    const e = entry as { label: string };
                    return e.label;
                  }}
                >
                  {data.agingBuckets
                    .filter((b) => b.count > 0)
                    .map((_, idx) => (
                      <Cell
                        key={`cell-${idx}`}
                        fill={AGING_COLORS[idx % AGING_COLORS.length]}
                      />
                    ))}
                </Pie>
                <Tooltip formatter={(value) => formatIndianCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-text-muted text-sm">
              No overdue installments
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <h2 className="font-medium mb-3">Payment methods</h2>
          {data && data.methodBreakdown.length > 0 ? (
            <div className="space-y-2 text-sm">
              {data.methodBreakdown.map((m) => (
                <div key={m.method} className="flex items-center justify-between">
                  <span>{m.method}</span>
                  <span className="text-text-muted">
                    {m.count} · {formatIndianCurrency(m.amount, true)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-muted text-sm">No payments</p>
          )}
        </Card>

        <Card>
          <h2 className="font-medium mb-3">Next month forecast</h2>
          <div className="text-3xl font-semibold">
            {data ? formatIndianCurrency(data.nextMonthForecast, true) : "—"}
          </div>
          <p className="text-xs text-text-muted mt-2">
            Linear projection from the last 3 months of collections.
          </p>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  highlight,
  danger,
  isLoading,
}: {
  title: string;
  value: string;
  highlight?: boolean;
  danger?: boolean;
  isLoading?: boolean;
}) {
  return (
    <Card>
      <div className="text-xs uppercase tracking-wider text-text-muted font-medium">{title}</div>
      <div
        className={`text-2xl font-semibold mt-1 ${
          highlight ? "text-indigo" : danger ? "text-danger" : "text-text-body"
        }`}
      >
        {isLoading ? "…" : value}
      </div>
    </Card>
  );
}
