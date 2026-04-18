import { Badge, Button } from "@/components/primitives";
import { useSocket } from "@/hooks/useSocket";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { ClipboardList, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AssignmentDetailModal } from "./AssignmentDetailModal";
import { CreateAssignmentModal } from "./CreateAssignmentModal";

type AssignmentStatus = "DRAFT" | "PUBLISHED" | "CLOSED";
type SubmissionStatus =
  | "NOT_OPENED"
  | "OPENED"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "LATE_SUBMITTED"
  | "GRADED"
  | "MISSED";

export interface Assignment {
  id: string;
  title: string;
  description: string;
  deadline: string;
  totalMarks: number | string;
  status: AssignmentStatus;
  allowLateSubmission: boolean;
  latePenaltyPercent: number | string | null;
  publishedAt: string | null;
  createdAt: string;
  subject: { id: string; name: string } | null;
  batch?: { id: string; name: string };
  createdBy?: { id: string; name: string };
  _count?: { submissions: number; attachments: number };
  mySubmission?: {
    status: SubmissionStatus;
    submittedAt: string | null;
    marksAwarded: number | string | null;
    isLate: boolean;
  } | null;
}

const STATUS_TONE: Record<AssignmentStatus, "neutral" | "success" | "info"> = {
  DRAFT: "neutral",
  PUBLISHED: "success",
  CLOSED: "info",
};

const SUB_STATUS_TONE: Record<
  SubmissionStatus,
  "neutral" | "info" | "warning" | "success" | "danger" | "accent"
> = {
  NOT_OPENED: "neutral",
  OPENED: "info",
  IN_PROGRESS: "warning",
  SUBMITTED: "success",
  LATE_SUBMITTED: "warning",
  GRADED: "accent",
  MISSED: "danger",
};

type Tab = "active" | "graded" | "missed" | "all";

export function AssignmentsPage() {
  const user = useAuthStore((s) => s.user);
  const isStudent = user?.role === "STUDENT";
  const canManage = user?.role === "ADMIN" || user?.role === "TEACHER";

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("active");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    api
      .get("/api/v1/assignments")
      .then((r) => setAssignments(r.data.data as Assignment[]))
      .catch(() => setAssignments([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useSocket("assignment:created", load);
  useSocket("assignment:published", load);
  useSocket("assignment:closed", load);
  useSocket("assignment:deleted", load);
  useSocket("submission:received", load);
  useSocket("submission:graded", load);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = assignments.filter((a) => {
    if (tab === "all") return true;
    if (!isStudent) {
      if (tab === "active") return a.status === "PUBLISHED";
      if (tab === "graded") return a.status === "CLOSED";
      return true;
    }
    const sub = a.mySubmission;
    if (tab === "active") {
      return (
        a.status === "PUBLISHED" &&
        (!sub || (sub.status !== "GRADED" && sub.status !== "MISSED"))
      );
    }
    if (tab === "graded") return sub?.status === "GRADED";
    if (tab === "missed") {
      return sub?.status === "MISSED" || (!sub && new Date(a.deadline) < new Date());
    }
    return true;
  });

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl tracking-tight">Assignments</h1>
          <p className="text-text-muted text-sm mt-1">
            {isStudent
              ? "Assignments from your teachers. Submit before the deadline."
              : "Create, publish, and grade assignments."}
          </p>
        </div>
        {canManage && (
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus size={14} />}
            onClick={() => setCreateOpen(true)}
          >
            Create Assignment
          </Button>
        )}
      </div>

      <div className="border-b border-border-soft mb-6 flex gap-1 overflow-x-auto">
        <TabBtn active={tab === "active"} onClick={() => setTab("active")}>
          Active
        </TabBtn>
        <TabBtn active={tab === "graded"} onClick={() => setTab("graded")}>
          {isStudent ? "Graded" : "Closed"}
        </TabBtn>
        {isStudent && (
          <TabBtn active={tab === "missed"} onClick={() => setTab("missed")}>
            Missed
          </TabBtn>
        )}
        <TabBtn active={tab === "all"} onClick={() => setTab("all")}>
          All
        </TabBtn>
      </div>

      {loading && (
        <div className="text-center text-text-dim text-xs py-12">Loading assignments...</div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="glass-panel text-center py-16">
          <ClipboardList size={32} className="mx-auto text-text-dim mb-3" />
          <p className="text-sm text-text-muted">No assignments here</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((a) => {
          const deadline = new Date(a.deadline);
          const isPastDeadline = deadline < new Date();
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setDetailId(a.id)}
              className="w-full glass-panel p-4 text-left hover:bg-surface-hover transition"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{a.title}</span>
                    <Badge tone={STATUS_TONE[a.status]}>{a.status}</Badge>
                    {a.mySubmission && (
                      <Badge tone={SUB_STATUS_TONE[a.mySubmission.status]}>
                        {a.mySubmission.status.replace(/_/g, " ")}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-text-muted line-clamp-2 mb-2">
                    {a.description}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text-dim flex-wrap">
                    {a.subject && <span>📚 {a.subject.name}</span>}
                    {a.batch && <span>🎓 {a.batch.name}</span>}
                    <span className={isPastDeadline ? "text-danger" : ""}>
                      ⏰ Due {deadline.toLocaleString()}
                    </span>
                    <span>📊 {Number(a.totalMarks)} marks</span>
                    {!isStudent && a._count && (
                      <span>📥 {a._count.submissions} submissions</span>
                    )}
                    {a.mySubmission?.marksAwarded !== undefined &&
                      a.mySubmission?.marksAwarded !== null && (
                        <span className="font-medium text-accent-primary">
                          Score: {Number(a.mySubmission.marksAwarded)}/{Number(a.totalMarks)}
                        </span>
                      )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {createOpen && (
        <CreateAssignmentModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            setToast("Assignment created (DRAFT — publish when ready)");
            load();
          }}
        />
      )}

      {detailId && (
        <AssignmentDetailModal
          assignmentId={detailId}
          onClose={() => setDetailId(null)}
          onChanged={(msg) => {
            if (msg) setToast(msg);
            load();
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 rounded-md bg-text-primary text-white text-xs px-4 py-2.5 shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm border-b-2 transition ${
        active
          ? "text-accent-primary border-accent-primary"
          : "text-text-muted border-transparent hover:text-text-primary"
      }`}
    >
      {children}
    </button>
  );
}
