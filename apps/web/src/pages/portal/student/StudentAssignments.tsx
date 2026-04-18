import { FileText } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "@/hooks/useSocket";
import { api } from "@/lib/api";
import {
  DateCountdown,
  Empty,
  PortalSkeleton,
  SectionHeader,
  SubmissionBadge,
} from "@/components/portal/PortalPrimitives";

interface AssignmentRow {
  id: string;
  title: string;
  description: string;
  deadline: string;
  totalMarks: number | string;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  subject: { id: string; name: string } | null;
  mySubmission: null | {
    status:
      | "NOT_OPENED"
      | "OPENED"
      | "IN_PROGRESS"
      | "SUBMITTED"
      | "LATE_SUBMITTED"
      | "GRADED"
      | "MISSED";
    submittedAt: string | null;
    marksAwarded: number | string | null;
    isLate: boolean;
  };
}

export function StudentAssignments() {
  const [items, setItems] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"active" | "past">("active");
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/api/v1/assignments");
      setItems(data.data ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useSocket("assignment:published", load);
  useSocket("assignment:closed", load);
  useSocket("submission:graded", load);

  const { active, past } = useMemo(() => {
    const now = new Date();
    const active: AssignmentRow[] = [];
    const past: AssignmentRow[] = [];
    for (const a of items) {
      const deadline = new Date(a.deadline);
      const isSubmitted =
        a.mySubmission?.status === "SUBMITTED" ||
        a.mySubmission?.status === "LATE_SUBMITTED" ||
        a.mySubmission?.status === "GRADED";
      if (deadline >= now && !isSubmitted) active.push(a);
      else past.push(a);
    }
    active.sort((a, b) => a.deadline.localeCompare(b.deadline));
    past.sort((a, b) => b.deadline.localeCompare(a.deadline));
    return { active, past };
  }, [items]);

  const list = tab === "active" ? active : past;

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader title="Assignments" />

      <div
        className="flex gap-1 p-1 rounded-full"
        style={{ backgroundColor: "#E8E3DA" }}
      >
        <TabButton
          label={`Active${active.length ? ` · ${active.length}` : ""}`}
          active={tab === "active"}
          onClick={() => setTab("active")}
        />
        <TabButton
          label={`Past${past.length ? ` · ${past.length}` : ""}`}
          active={tab === "past"}
          onClick={() => setTab("past")}
        />
      </div>

      {loading && items.length === 0 ? (
        <div className="flex flex-col gap-2">
          <PortalSkeleton height={88} />
          <PortalSkeleton height={88} />
        </div>
      ) : list.length === 0 ? (
        <Empty
          icon={<FileText size={20} />}
          title={tab === "active" ? "Nothing active" : "No past assignments"}
          body={
            tab === "active" ? "You're all caught up." : "Submitted work will show up here."
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => navigate(`/portal/student/assignments/${a.id}`)}
              className="glass-panel p-4 text-left flex items-start gap-3 transition-transform active:scale-[0.99]"
              style={{ minHeight: 80 }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: "#E0E7FF", color: "#4F46E5" }}
              >
                <FileText size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "#2C2C2A" }}>
                  {a.title}
                </p>
                <p className="text-xs mt-0.5 truncate" style={{ color: "#6B6A66" }}>
                  {a.subject?.name ?? "—"} · {a.totalMarks} marks
                </p>
                <div className="flex gap-2 mt-2">
                  <DateCountdown to={a.deadline} />
                  <SubmissionBadge status={a.mySubmission?.status ?? "NOT_OPENED"} />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 h-10 rounded-full text-sm font-medium transition-colors"
      style={{
        backgroundColor: active ? "#FAF7F2" : "transparent",
        color: active ? "#2C2C2A" : "#6B6A66",
        boxShadow: active ? "0 2px 6px rgba(0,0,0,0.05)" : "none",
        minHeight: 44,
      }}
    >
      {label}
    </button>
  );
}
