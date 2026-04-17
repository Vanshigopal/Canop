import { useAuthStore } from "@/stores/auth";

export function TeacherDashboard() {
  const user = useAuthStore((s) => s.user);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div>
      <h1 className="font-display text-3xl tracking-tight mb-1">
        {greeting},{" "}
        <span className="italic text-coral">{user?.name?.split(" ")[0] || "Teacher"}</span>.
      </h1>
      <p className="text-text-muted text-md mb-8">Your teaching dashboard is being built.</p>

      <div className="glass-panel p-6 max-w-md">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-2 h-2 rounded-full bg-warning" />
          <span className="font-mono text-xs uppercase tracking-wider text-warning font-semibold">
            Coming in Session 6
          </span>
        </div>
        <p className="text-sm text-text-muted">
          Class schedule, attendance marking, and student performance — all in one view.
        </p>
      </div>
    </div>
  );
}
