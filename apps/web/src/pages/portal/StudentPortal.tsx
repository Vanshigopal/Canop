import { useAuthStore } from "@/stores/auth";

export function StudentPortal() {
  const user = useAuthStore((s) => s.user);

  return (
    <div>
      <h1 className="font-display text-3xl tracking-tight mb-1">
        Welcome back,{" "}
        <span className="italic text-coral">{user?.name?.split(" ")[0] || "Student"}</span>.
      </h1>
      <p className="text-text-muted text-md mb-8">Your student portal is being built.</p>

      <div className="glass-panel p-6 max-w-md">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-2 h-2 rounded-full bg-warning" />
          <span className="font-mono text-xs uppercase tracking-wider text-warning font-semibold">
            Coming in Session 5
          </span>
        </div>
        <p className="text-sm text-text-muted">
          Your classes, marks, assignments, and schedule — all in one place.
        </p>
      </div>
    </div>
  );
}
