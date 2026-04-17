import { Badge } from "@/components/primitives";
import { useSocket } from "@/hooks/useSocket";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { useStatsStore } from "@/stores/stats";
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckSquare,
  ChevronRight,
  GraduationCap,
  IndianRupee,
  Lock,
  RefreshCw,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

type Period = "today" | "week" | "month" | "quarter";

interface BatchOption {
  id: string;
  name: string;
}

export function AdminDashboard() {
  const user = useAuthStore((s) => s.user);
  const { studentCount, batchCount, teacherCount, todayAttendance, monthRevenue, fetch } =
    useStatsStore();
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [filterBatchId, setFilterBatchId] = useState("");
  const [period, setPeriod] = useState<Period>("today");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetch();
    api.get("/api/v1/batches").then((r) => {
      setBatches(
        r.data.data.map((b: { id: string; name: string }) => ({ id: b.id, name: b.name })),
      );
    });
  }, [fetch]);

  useSocket("stats:updated", () => {
    fetch();
  });
  useSocket("payment:received", () => {
    fetch();
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const filteredSessions = useMemo(() => {
    if (!todayAttendance) return [];
    if (!filterBatchId) return todayAttendance.sessions;
    return todayAttendance.sessions.filter((s) => s.batch.id === filterBatchId);
  }, [todayAttendance, filterBatchId]);

  const scopedTotals = useMemo(() => {
    const present = filteredSessions.reduce((s, sess) => s + sess.totalPresent + sess.totalLate, 0);
    const total = filteredSessions.reduce(
      (s, sess) => s + sess.totalPresent + sess.totalAbsent + sess.totalLate,
      0,
    );
    const pct = total > 0 ? Math.round((present / total) * 1000) / 10 : null;
    return { present, total, pct };
  }, [filteredSessions]);

  const scopedBatchCount = filterBatchId ? 1 : batchCount;
  const scopedStudentCount = filterBatchId
    ? filteredSessions[0]?.batch.studentCount ?? studentCount
    : studentCount;
  const todayPct = scopedTotals.pct !== null ? `${scopedTotals.pct}%` : "—";

  const revenueValue = monthRevenue
    ? `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(monthRevenue.collected)}`
    : "—";
  const revenueSub = monthRevenue ? (
    <span
      className={`inline-flex items-center gap-1 text-2xs ${
        monthRevenue.trend === "up"
          ? "text-success"
          : monthRevenue.trend === "down"
            ? "text-danger"
            : "text-text-dim"
      }`}
    >
      {monthRevenue.trend === "up" ? (
        <ArrowUpRight size={11} />
      ) : monthRevenue.trend === "down" ? (
        <ArrowDownRight size={11} />
      ) : null}
      {monthRevenue.trendPercent.toFixed(1)}% vs last month
    </span>
  ) : null;

  const stats = [
    {
      label: "Active Students",
      value: <AnimatedNumber value={scopedStudentCount} />,
      icon: Users,
      bg: "#FECDD3",
      fg: "#EC4899",
      sub: null,
    },
    {
      label: "Batches Running",
      value: <AnimatedNumber value={scopedBatchCount} />,
      icon: GraduationCap,
      bg: "#BAE6FD",
      fg: "#0284C7",
      sub: null,
    },
    {
      label: "Today's Attendance",
      value: todayPct,
      icon: CheckSquare,
      bg: "#BBF7D0",
      fg: "#059669",
      sub: <span className="text-2xs text-text-dim">{teacherCount} teachers</span>,
    },
    {
      label: "Revenue MTD",
      value: revenueValue,
      icon: IndianRupee,
      bg: "#FEF3C7",
      fg: "#D97706",
      sub: revenueSub,
    },
  ] as Array<{
    label: string;
    value: React.ReactNode;
    icon: typeof Users;
    bg: string;
    fg: string;
    sub: React.ReactNode;
  }>;

  async function handleRefresh() {
    setRefreshing(true);
    await fetch();
    setTimeout(() => setRefreshing(false), 400);
  }

  return (
    <div>
      <h1 className="font-display text-3xl tracking-tight mb-1">
        {greeting},{" "}
        <span className="italic text-coral">{user?.name?.split(" ")[0] || "Admin"}</span>.
      </h1>
      <p className="text-text-muted text-md mb-6">
        Here&apos;s what&apos;s happening at your institute today.
      </p>

      <div className="flex gap-2 items-center mb-6 flex-wrap">
        <select
          value={filterBatchId}
          onChange={(e) => setFilterBatchId(e.target.value)}
          className="rounded-md border border-border-soft bg-white/92 px-3 py-2 text-sm text-text-primary outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/15"
        >
          <option value="">All batches</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
          className="rounded-md border border-border-soft bg-white/92 px-3 py-2 text-sm text-text-primary outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/15"
        >
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="quarter">This Quarter</option>
        </select>
        <button
          type="button"
          onClick={handleRefresh}
          className="inline-flex items-center gap-1.5 rounded-md border border-border-soft bg-white/92 px-3 py-2 text-sm text-text-muted hover:text-text-primary"
          aria-label="Refresh"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="glass-panel p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-text-muted">{stat.label}</span>
                <div
                  className="w-9 h-9 rounded-xl grid place-items-center"
                  style={{ background: stat.bg }}
                >
                  <Icon size={18} style={{ color: stat.fg }} />
                </div>
              </div>
              <div className="text-2xl font-semibold text-text-primary tracking-tight">
                {stat.value}
              </div>
              {stat.sub && <div className="mt-1">{stat.sub}</div>}
            </div>
          );
        })}
      </div>

      <div className="glass-panel p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg">Today&apos;s batches</h2>
          <Link to="/attendance" className="text-xs text-indigo hover:underline">
            Go to attendance →
          </Link>
        </div>
        {!todayAttendance || filteredSessions.length === 0 ? (
          <p className="text-sm text-text-dim">
            No sessions {filterBatchId ? "for this batch" : "scheduled today"} yet. Start one from the
            Attendance page.
          </p>
        ) : (
          <div className="divide-y divide-border-soft -mx-2">
            {filteredSessions.map((s) => {
              const total = s.totalPresent + s.totalAbsent + s.totalLate;
              const pct =
                s.batch.studentCount > 0
                  ? Math.round((s.totalPresent / s.batch.studentCount) * 100)
                  : 0;
              return (
                <Link
                  key={s.id}
                  to="/attendance"
                  className="flex items-center gap-4 px-2 py-3 hover:bg-white/40 rounded transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-text-primary">{s.batch.name}</span>
                      <Badge tone="info">{s.type.charAt(0) + s.type.slice(1).toLowerCase()}</Badge>
                      {s.subject && (
                        <span className="text-2xs text-text-dim">· {s.subject.name}</span>
                      )}
                      <SessionStatusBadge isFinalized={s.isFinalized} hasActivity={total > 0} />
                    </div>
                    <div className="text-2xs text-text-dim mt-0.5">
                      {s.startTime ?? "—"} — {s.endTime ?? "—"} · {total}/{s.batch.studentCount}{" "}
                      marked
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-text-primary">{pct}%</div>
                    <div className="text-2xs text-text-dim">present</div>
                  </div>
                  <ChevronRight size={14} className="text-text-dim" />
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="glass-panel p-6 max-w-2xl">
        <h2 className="font-display text-lg mb-4">What&apos;s coming next</h2>
        <div className="space-y-3">
          <Upcoming session={8} text="SMS & WhatsApp reminders for fees + attendance" />
          <Upcoming session={9} text="Exams, marks entry, OMR scanning, and gradebook" />
          <Upcoming session={10} text="Retest scheduling and exam workflows" />
        </div>
      </div>
    </div>
  );
}

function SessionStatusBadge({
  isFinalized,
  hasActivity,
}: {
  isFinalized: boolean;
  hasActivity: boolean;
}) {
  if (isFinalized) {
    return (
      <Badge tone="neutral">
        <Lock size={10} className="mr-0.5" /> Finalized
      </Badge>
    );
  }
  if (hasActivity) {
    return (
      <Badge tone="success">
        <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-slow mr-1" />
        In progress
      </Badge>
    );
  }
  return <Badge tone="warning">Not started</Badge>;
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    if (value === display) return;
    const from = display;
    const to = value;
    const steps = 12;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setDisplay(Math.round(from + ((to - from) * i) / steps));
      if (i >= steps) clearInterval(id);
    }, 30);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <>{display}</>;
}

function Upcoming({ session, text }: { session: number; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="font-mono text-2xs text-indigo font-semibold bg-indigo/10 px-2 py-0.5 rounded shrink-0">
        S{session}
      </span>
      <span className="text-sm text-text-body">{text}</span>
    </div>
  );
}
