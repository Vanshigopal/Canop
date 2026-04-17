import { useAuthStore } from "@/stores/auth";
import { Users, GraduationCap, CheckSquare, IndianRupee } from "lucide-react";

const stats = [
  { label: "Active Students", value: "247", icon: Users, bg: "#FECDD3", fg: "#EC4899" },
  { label: "Batches Running", value: "14", icon: GraduationCap, bg: "#BAE6FD", fg: "#0284C7" },
  { label: "Today's Attendance", value: "91%", icon: CheckSquare, bg: "#BBF7D0", fg: "#059669" },
  { label: "Revenue MTD", value: "\u20B94.82L", icon: IndianRupee, bg: "#FEF3C7", fg: "#D97706" },
];

const upcoming = [
  { session: 5, desc: "Student enrollment, batch management, and join request approval" },
  { session: 6, desc: "Attendance marking and timetable builder" },
  { session: 7, desc: "Exams, marks entry, OMR scanning, and gradebook" },
  { session: 8, desc: "Fee management and payment gateway integration" },
];

export function AdminDashboard() {
  const user = useAuthStore((s) => s.user);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

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

      <div className="glass-panel p-6 max-w-2xl">
        <h2 className="font-display text-lg mb-4">What&apos;s coming next</h2>
        <div className="space-y-3">
          {upcoming.map((item) => (
            <div key={item.session} className="flex items-start gap-3">
              <span className="font-mono text-2xs text-indigo font-semibold bg-indigo/10 px-2 py-0.5 rounded shrink-0">
                S{item.session}
              </span>
              <span className="text-sm text-text-body">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
