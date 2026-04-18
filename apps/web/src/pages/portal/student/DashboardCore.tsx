import { ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { formatIndianCurrency } from "@/lib/indian-numbers";
import {
  AttendanceBadge,
  DateCountdown,
  Empty,
  PortalCard,
  PortalSkeleton,
  PrimaryButton,
  SectionHeader,
  SubmissionBadge,
  formatRelativeDate,
  greetingByTime,
  severityColor,
} from "@/components/portal/PortalPrimitives";
import type { DashboardSnapshot } from "@/components/portal/portal-types";

interface Props {
  dashboard: DashboardSnapshot | null;
  loading: boolean;
  navPrefix: string;
}

export function DashboardCore({ dashboard, loading, navPrefix }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const displayName = dashboard?.student.name ?? user?.name ?? "";

  if (loading && !dashboard) {
    return (
      <div className="flex flex-col gap-4">
        <PortalSkeleton height={110} />
        <PortalSkeleton height={140} />
        <PortalSkeleton height={80} />
        <PortalSkeleton height={80} />
      </div>
    );
  }

  if (!dashboard) {
    return <Empty title="Unable to load dashboard" body="Pull down to retry." />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="mb-1">
        <p className="text-sm" style={{ color: "#6B6A66" }}>
          {greetingByTime()}
        </p>
        <h1
          className="text-2xl leading-tight"
          style={{ fontFamily: "Fraunces, serif", fontWeight: 500, color: "#2C2C2A" }}
        >
          {displayName.split(" ")[0] ?? displayName}
        </h1>
        {dashboard.student.batchName && (
          <p className="text-xs mt-0.5" style={{ color: "#6B6A66" }}>
            {dashboard.student.className ?? dashboard.student.batchName} ·{" "}
            {dashboard.student.rollNumber ?? ""}
          </p>
        )}
      </div>

      <PortalCard>
        <div className="flex items-start justify-between mb-3">
          <div>
            <p
              className="text-[10px] uppercase tracking-[0.15em]"
              style={{ color: "#6B6A66", fontWeight: 600 }}
            >
              Today
            </p>
            <p
              className="text-sm mt-1 font-medium"
              style={{ color: "#2C2C2A" }}
            >
              {dashboard.todayAttendance?.subjectName ?? "No class today"}
            </p>
          </div>
          {dashboard.todayAttendance && (
            <AttendanceBadge status={dashboard.todayAttendance.status} />
          )}
        </div>
        <div
          className="text-4xl font-semibold leading-none"
          style={{ color: severityColor(dashboard.weekAttendancePct) }}
        >
          {dashboard.weekAttendancePct !== null
            ? `${dashboard.weekAttendancePct}%`
            : "—"}
        </div>
        <p className="text-xs mt-1.5" style={{ color: "#6B6A66" }}>
          This week's attendance
        </p>
      </PortalCard>

      {dashboard.pendingFees.installmentCount > 0 && (
        <PortalCard accent="amber">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p
                className="text-[10px] uppercase tracking-[0.15em]"
                style={{ color: "#78350F", fontWeight: 600 }}
              >
                Fees due
              </p>
              <p
                className="text-xl mt-1 font-semibold"
                style={{ color: "#2C2C2A" }}
              >
                {formatIndianCurrency(dashboard.pendingFees.totalAmount)}
              </p>
              {dashboard.pendingFees.nearestDueDate && (
                <p className="text-xs mt-0.5" style={{ color: "#78350F" }}>
                  Due {formatRelativeDate(dashboard.pendingFees.nearestDueDate)}
                </p>
              )}
            </div>
            <PrimaryButton onClick={() => navigate(`${navPrefix}/fees`)}>
              Pay
            </PrimaryButton>
          </div>
        </PortalCard>
      )}

      {dashboard.upcomingAssignments.length > 0 && (
        <section>
          <SectionHeader
            title="Due soon"
            action={{
              label: "View all",
              onClick: () => navigate(`${navPrefix}/assignments`),
            }}
          />
          <div className="flex flex-col gap-2">
            {dashboard.upcomingAssignments.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => navigate(`${navPrefix}/assignments/${a.id}`)}
                className="glass-panel p-4 text-left flex items-center gap-3 transition-transform active:scale-[0.99]"
                style={{ minHeight: 72 }}
              >
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: "#2C2C2A" }}
                  >
                    {a.title}
                  </p>
                  <p
                    className="text-xs mt-0.5 truncate"
                    style={{ color: "#6B6A66" }}
                  >
                    {a.subjectName ?? "—"} · {a.totalMarks} marks
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <DateCountdown to={a.deadline} />
                  <SubmissionBadge status={a.status} />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {dashboard.recentResults.length > 0 && (
        <section>
          <SectionHeader
            title="Latest results"
            action={{
              label: "View all",
              onClick: () => navigate(`${navPrefix}/grades`),
            }}
          />
          <div className="flex flex-col gap-2">
            {dashboard.recentResults.map((r) => {
              const pct = r.percentage;
              const TrendIcon =
                r.trendDirection === "up"
                  ? TrendingUp
                  : r.trendDirection === "down"
                    ? TrendingDown
                    : null;
              return (
                <button
                  key={r.examId}
                  type="button"
                  onClick={() => navigate(`${navPrefix}/grades`)}
                  className="glass-panel p-4 flex items-center gap-3 transition-transform active:scale-[0.99]"
                  style={{ minHeight: 72 }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: `${severityColor(pct)}20`,
                      color: severityColor(pct),
                    }}
                  >
                    <span className="text-xs font-bold">{Math.round(pct)}%</span>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p
                      className="text-sm font-medium truncate"
                      style={{ color: "#2C2C2A" }}
                    >
                      {r.examName}
                    </p>
                    <p
                      className="text-xs mt-0.5 truncate"
                      style={{ color: "#6B6A66" }}
                    >
                      {r.subjectName ?? "—"} · {r.marksObtained}/{r.totalMarks}
                      {r.batchRank ? ` · Rank ${r.batchRank}` : ""}
                    </p>
                  </div>
                  {TrendIcon && (
                    <TrendIcon
                      size={18}
                      color={r.trendDirection === "up" ? "#10B981" : "#DC2626"}
                      strokeWidth={2}
                    />
                  )}
                  <ChevronRight size={16} color="#6B6A66" />
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
