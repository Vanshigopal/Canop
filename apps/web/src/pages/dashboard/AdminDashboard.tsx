import { Link } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
import { useStatsStore } from "@/stores/stats";
import { Users, GraduationCap, CheckSquare, IndianRupee, Lock, ChevronRight } from "lucide-react";
import { Badge } from "@/components/primitives";

export function AdminDashboard() {
  const user = useAuthStore((s) => s.user);
  const { studentCount, batchCount, teacherCount, todayAttendance } = useStatsStore();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const todayPct =
    todayAttendance && todayAttendance.overallTotal > 0 ? `${todayAttendance.percentage}%` : "—";

  const stats = [
    { label: "Active Students", value: String(studentCount), icon: Users, bg: "#FECDD3", fg: "#EC4899" },
    { label: "Batches Running", value: String(batchCount), icon: GraduationCap, bg: "#BAE6FD", fg: "#0284C7" },
    { label: "Teachers", value: String(teacherCount), icon: CheckSquare, bg: "#BBF7D0", fg: "#059669" },
    { label: "Today's Attendance", value: todayPct, icon: IndianRupee, bg: "#FEF3C7", fg: "#D97706" },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl tracking-tight mb-1">
        {greeting},{" "}
        <span className="italic text-coral">{user?.name?.split(" ")[0] || "Admin"}</span>.
      </h1>
      <p className="text-text-muted text-md mb-8">
        Here&apos;s what&apos;s happening at your institute today.
      </p>

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
        {!todayAttendance || todayAttendance.sessions.length === 0 ? (
          <p className="text-sm text-text-dim">No sessions scheduled for today yet. Start one from the Attendance page.</p>
        ) : (
          <div className="divide-y divide-border-soft -mx-2">
            {todayAttendance.sessions.map((s) => {
              const total = s.totalPresent + s.totalAbsent + s.totalLate;
              const pct = s.batch.studentCount > 0 ? Math.round((s.totalPresent / s.batch.studentCount) * 100) : 0;
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
                      {s.subject && <span className="text-2xs text-text-dim">· {s.subject.name}</span>}
                      {s.isFinalized ? (
                        <Badge tone="neutral">
                          <Lock size={10} className="mr-0.5" /> Finalized
                        </Badge>
                      ) : (
                        <Badge tone="warning">In progress</Badge>
                      )}
                    </div>
                    <div className="text-2xs text-text-dim mt-0.5">
                      {s.startTime ?? "—"} — {s.endTime ?? "—"} · {total}/{s.batch.studentCount} marked
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
          <Upcoming session={7} text="Exams, marks entry, OMR scanning, and gradebook" />
          <Upcoming session={8} text="Fee management and payment gateway integration" />
          <Upcoming session={9} text="Retest scheduling and exam workflows" />
        </div>
      </div>
    </div>
  );
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
