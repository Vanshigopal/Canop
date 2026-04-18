import { useQuery } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BarChart3,
  CheckSquare,
  Download,
  GraduationCap,
  IndianRupee,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/primitives";
import { api } from "@/lib/api";
import { formatIndianCurrency, formatIndianNumber } from "@/lib/indian-numbers";

interface KPI {
  value: number;
  delta: number;
  label: string;
}

interface HealthScorecard {
  studentCount: KPI;
  attendancePct: KPI;
  revenue: KPI;
  collectionRate: KPI;
  engagement: KPI;
  atRisk: KPI;
  passRate: KPI;
  pendingRetests: KPI;
}

const HUB_LINKS = [
  {
    to: "/analytics/attendance",
    label: "Attendance Analytics",
    icon: CheckSquare,
    description: "Daily trends, heatmaps, batch comparison",
  },
  {
    to: "/analytics/academic",
    label: "Academic Analytics",
    icon: GraduationCap,
    description: "Exam trends, subject breakdown, grades",
  },
  {
    to: "/analytics/financial",
    label: "Financial Analytics",
    icon: IndianRupee,
    description: "Collection rates, aging, forecasts",
  },
  {
    to: "/analytics/engagement",
    label: "Engagement Analytics",
    icon: Sparkles,
    description: "Scores, content consumption, at-risk",
  },
  {
    to: "/analytics/compare",
    label: "Batch Comparison",
    icon: TrendingUp,
    description: "Side-by-side batch metrics",
  },
  {
    to: "/analytics/exports",
    label: "Export Reports",
    icon: Download,
    description: "CSV + HTML report generation",
  },
];

function Trend({ delta, suffix = "" }: { delta: number; suffix?: string }) {
  if (delta === 0) return <span className="text-text-muted text-xs">no change</span>;
  const up = delta > 0;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${
        up ? "text-success" : "text-danger"
      }`}
    >
      <Icon size={12} />
      {Math.abs(delta)}
      {suffix}
    </span>
  );
}

export function AnalyticsPage() {
  const { data, isLoading } = useQuery<HealthScorecard>({
    queryKey: ["analytics-scorecard"],
    queryFn: () => api.get("/api/v1/analytics/health-scorecard").then((r) => r.data.data),
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl mb-1">Institute Health</h1>
        <p className="text-text-muted text-sm">Top-level KPIs and deep-dive analytics hub</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Students"
          value={data ? formatIndianNumber(data.studentCount.value) : "—"}
          trend={data ? <Trend delta={data.studentCount.delta} /> : null}
          icon={Users}
          isLoading={isLoading}
        />
        <KPICard
          title="Attendance"
          value={data ? `${data.attendancePct.value}%` : "—"}
          trend={data ? <Trend delta={data.attendancePct.delta} suffix="%" /> : null}
          icon={CheckSquare}
          isLoading={isLoading}
        />
        <KPICard
          title="Revenue MTD"
          value={data ? formatIndianCurrency(data.revenue.value, true) : "—"}
          trend={
            data ? (
              <span className="text-text-muted text-xs">
                {data.revenue.delta >= 0 ? "+" : ""}
                {formatIndianCurrency(data.revenue.delta, true)}
              </span>
            ) : null
          }
          icon={IndianRupee}
          isLoading={isLoading}
        />
        <KPICard
          title="Collection"
          value={data ? `${data.collectionRate.value}%` : "—"}
          trend={data ? <Trend delta={data.collectionRate.delta} suffix="%" /> : null}
          icon={BarChart3}
          isLoading={isLoading}
        />
        <KPICard
          title="Engagement"
          value={data ? String(data.engagement.value) : "—"}
          trend={data ? <Trend delta={data.engagement.delta} suffix=" pts" /> : null}
          icon={Sparkles}
          isLoading={isLoading}
        />
        <KPICard
          title="At-Risk"
          value={data ? String(data.atRisk.value) : "—"}
          trend={data ? <Trend delta={-data.atRisk.delta} /> : null}
          icon={Zap}
          isLoading={isLoading}
        />
        <KPICard
          title="Pass Rate"
          value={data ? `${data.passRate.value}%` : "—"}
          trend={data ? <Trend delta={data.passRate.delta} suffix="%" /> : null}
          icon={GraduationCap}
          isLoading={isLoading}
        />
        <KPICard
          title="Pending Retests"
          value={data ? String(data.pendingRetests.value) : "—"}
          trend={<span className="text-text-muted text-xs">active</span>}
          icon={TrendingUp}
          isLoading={isLoading}
        />
      </div>

      <div>
        <h2 className="text-lg font-medium mb-3">Deep-dive analytics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {HUB_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.to}
                to={link.to}
                className="glass-panel p-4 rounded-xl hover:shadow-md transition-all group flex items-start gap-3"
              >
                <div className="p-2 rounded-lg bg-indigo/10">
                  <Icon size={18} className="text-indigo" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-text-body flex items-center justify-between">
                    <span>{link.label}</span>
                    <ArrowRight
                      size={14}
                      className="text-text-muted group-hover:translate-x-1 transition-transform"
                    />
                  </div>
                  <div className="text-xs text-text-muted mt-0.5">{link.description}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function KPICard({
  title,
  value,
  trend,
  icon: Icon,
  isLoading,
}: {
  title: string;
  value: string;
  trend: ReactNode;
  icon: LucideIcon;
  isLoading: boolean;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-text-muted font-medium">
            {title}
          </div>
          <div className="text-2xl font-semibold mt-1">{isLoading ? "…" : value}</div>
          <div className="mt-2">{trend}</div>
        </div>
        <div className="p-2 rounded-lg bg-bg-warm">
          <Icon size={16} className="text-text-muted" />
        </div>
      </div>
    </Card>
  );
}
