import { useLocation, Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

const LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  students: "Students",
  teachers: "Teachers",
  batches: "Batches",
  attendance: "Attendance",
  exams: "Exams & Marks",
  omr: "OMR Scanner",
  gradebook: "Gradebook",
  retests: "Retests",
  fees: "Fees",
  payments: "Payments",
  materials: "Materials",
  videos: "Videos",
  assignments: "Assignments",
  announcements: "Announcements",
  timetable: "Timetable",
  communications: "Messages",
  "ai-assistant": "AI Assistant",
  analytics: "Analytics",
  events: "Events",
  settings: "Settings",
  "join-requests": "Join Requests",
  portal: "Student Portal",
  parent: "Parent Portal",
};

export function Breadcrumbs() {
  const { pathname } = useLocation();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0 || (segments.length === 1 && segments[0] === "dashboard")) {
    return null;
  }

  return (
    <nav className="flex items-center gap-1.5 mb-6 text-sm">
      <Link to="/dashboard" className="text-text-dim hover:text-text-body transition-colors">
        <Home size={14} />
      </Link>
      {segments.map((seg, i) => {
        const path = "/" + segments.slice(0, i + 1).join("/");
        const label = LABELS[seg] || seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ");
        const isLast = i === segments.length - 1;

        return (
          <span key={path} className="flex items-center gap-1.5">
            <ChevronRight size={12} className="text-text-dim" />
            {isLast ? (
              <span className="text-text-body font-medium">{label}</span>
            ) : (
              <Link to={path} className="text-text-dim hover:text-text-body transition-colors">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
