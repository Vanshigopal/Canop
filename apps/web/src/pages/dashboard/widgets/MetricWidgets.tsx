import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, CheckSquare, IndianRupee, Users, Zap } from "lucide-react";
import { api } from "@/lib/api";
import { formatIndianCurrency, formatIndianNumber } from "@/lib/indian-numbers";

interface HealthKPI {
  value: number;
  delta: number;
  label: string;
}

interface HealthScorecard {
  studentCount: HealthKPI;
  attendancePct: HealthKPI;
  revenue: HealthKPI;
  collectionRate: HealthKPI;
  engagement: HealthKPI;
  atRisk: HealthKPI;
  passRate: HealthKPI;
  pendingRetests: HealthKPI;
}

function useScorecard() {
  return useQuery<HealthScorecard>({
    queryKey: ["analytics-scorecard"],
    queryFn: () => api.get("/api/v1/analytics/health-scorecard").then((r) => r.data.data),
    staleTime: 60_000,
  });
}

function DeltaChip({ delta, suffix = "" }: { delta: number; suffix?: string }) {
  if (!delta) return <span className="text-xs text-text-muted">no change</span>;
  const up = delta > 0;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs ${
        up ? "text-success" : "text-danger"
      }`}
    >
      <Icon size={12} />
      {Math.abs(delta)}
      {suffix}
    </span>
  );
}

function MetricShell({
  title,
  value,
  trend,
  icon: Icon,
}: {
  title: string;
  value: string;
  trend: React.ReactNode;
  icon: typeof Users;
}) {
  return (
    <div className="h-full p-4 flex flex-col">
      <div className="flex items-start justify-between">
        <div className="text-xs uppercase tracking-wider text-text-muted font-medium">
          {title}
        </div>
        <Icon size={14} className="text-text-muted" />
      </div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      <div className="mt-auto">{trend}</div>
    </div>
  );
}

export function StudentCountWidget() {
  const { data } = useScorecard();
  const v = data?.studentCount;
  return (
    <MetricShell
      title="Total Students"
      value={v ? formatIndianNumber(v.value) : "—"}
      trend={
        v ? (
          <span className="text-xs text-text-muted">
            +{v.delta} new
          </span>
        ) : null
      }
      icon={Users}
    />
  );
}

export function AttendanceTodayWidget() {
  const { data } = useScorecard();
  const v = data?.attendancePct;
  return (
    <MetricShell
      title="Attendance"
      value={v ? `${v.value}%` : "—"}
      trend={v ? <DeltaChip delta={v.delta} suffix="%" /> : null}
      icon={CheckSquare}
    />
  );
}

export function RevenueMTDWidget() {
  const { data } = useScorecard();
  const v = data?.revenue;
  return (
    <MetricShell
      title="Revenue MTD"
      value={v ? formatIndianCurrency(v.value, true) : "—"}
      trend={
        v ? (
          <span className="text-xs text-text-muted">
            {v.delta >= 0 ? "+" : ""}
            {formatIndianCurrency(v.delta, true)}
          </span>
        ) : null
      }
      icon={IndianRupee}
    />
  );
}

export function PendingRetestsWidget() {
  const { data } = useScorecard();
  const v = data?.pendingRetests;
  return (
    <MetricShell
      title="Pending Retests"
      value={v ? String(v.value) : "—"}
      trend={<span className="text-xs text-text-muted">active</span>}
      icon={Zap}
    />
  );
}
