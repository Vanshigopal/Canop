import { Badge } from "@/components/primitives";
import { useSocket } from "@/hooks/useSocket";
import { api } from "@/lib/api";
import { useCallback, useEffect, useState } from "react";
import { EnterRetestMarksModal } from "./EnterRetestMarksModal";
import { RetestCard } from "./RetestCard";
import { ScheduleRetestModal } from "./ScheduleRetestModal";

export type RetestStatus = "PENDING_SCHEDULE" | "SCHEDULED" | "COMPLETED" | "NO_SHOW" | "CANCELLED";

export interface RetestRow {
  id: string;
  tenantId: string;
  examId: string;
  studentId: string;
  originalMarks: number;
  originalPercentage: number;
  cutOff: number;
  cutOffType: "MARKS" | "PERCENTAGE";
  scheduledDate: string | null;
  scheduledTime: string | null;
  confirmedAt: string | null;
  attendedAt: string | null;
  status: RetestStatus;
  retestMarks: number | null;
  retestPercentage: number | null;
  retestIsPassed: boolean | null;
  retestMcqCorrect: number | null;
  retestMcqIncorrect: number | null;
  retestMcqUnattempted: number | null;
  retestTheoryMarks: number | null;
  note: string | null;
  createdAt: string;
  exam: {
    id: string;
    name: string;
    type: "THEORY" | "MCQ" | "THEORY_MCQ" | "OBJECTIVE" | "NUMERICAL";
    totalMarks: number;
    totalQuestions: number | null;
    marksPerCorrect: number | null;
    marksPerWrong: number | null;
    marksPerUnattempted: number | null;
    theoryMaxMarks: number | null;
    mcqMaxMarks: number | null;
    mcqQuestionCount: number | null;
    passingMarks: number | null;
    passingPercent: number | null;
    cutOffType: "MARKS" | "PERCENTAGE";
    examDate: string | null;
    subject: { id: string; name: string } | null;
    batch: { id: string; name: string };
  };
  student: {
    id: string;
    rollNumber: string | null;
    user: { id: string; name: string };
    batch: { id: string; name: string } | null;
  };
  confirmedBy: { id: string; name: string } | null;
}

type TabKey = "all" | "pending" | "scheduled" | "today" | "completed" | "no-show";

function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const today = new Date();
  const d = new Date(dateStr);
  return (
    d.getUTCFullYear() === today.getUTCFullYear() &&
    d.getUTCMonth() === today.getUTCMonth() &&
    d.getUTCDate() === today.getUTCDate()
  );
}

export function RetestsPage() {
  const [tab, setTab] = useState<TabKey>("all");
  const [retests, setRetests] = useState<RetestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [filterBatch, setFilterBatch] = useState("");
  const [batches, setBatches] = useState<Array<{ id: string; name: string }>>([]);
  const [scheduleTarget, setScheduleTarget] = useState<RetestRow | null>(null);
  const [marksTarget, setMarksTarget] = useState<RetestRow | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (filterBatch) params.batchId = filterBatch;
    api
      .get("/api/v1/retests", { params })
      .then((r) => setRetests(r.data.data as RetestRow[]))
      .catch(() => setRetests([]))
      .finally(() => setLoading(false));
  }, [filterBatch]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api
      .get("/api/v1/batches")
      .then((r) => setBatches(r.data.data as Array<{ id: string; name: string }>))
      .catch(() => setBatches([]));
  }, []);

  useSocket<{ retestId: string }>("retest:created", load);
  useSocket<{ retestId: string }>("retest:scheduled", load);
  useSocket<{ retestId: string }>("retest:attended", load);
  useSocket<{ retestId: string }>("retest:completed", load);
  useSocket<{ retestId: string }>("retest:no-show", load);
  useSocket<{ retestId: string }>("retest:cancelled", load);
  useSocket<{ examId: string; count: number }>("retests:bulk-created", load);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = retests.filter((r) => {
    if (tab === "pending" && r.status !== "PENDING_SCHEDULE") return false;
    if (tab === "scheduled" && r.status !== "SCHEDULED") return false;
    if (tab === "today" && !(r.status === "SCHEDULED" && isToday(r.scheduledDate))) return false;
    if (tab === "completed" && r.status !== "COMPLETED") return false;
    if (tab === "no-show" && r.status !== "NO_SHOW") return false;
    if (search) {
      const q = search.toLowerCase();
      if (!r.student.user.name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const counts = {
    all: retests.length,
    pending: retests.filter((r) => r.status === "PENDING_SCHEDULE").length,
    scheduled: retests.filter((r) => r.status === "SCHEDULED").length,
    today: retests.filter((r) => r.status === "SCHEDULED" && isToday(r.scheduledDate)).length,
    completed: retests.filter((r) => r.status === "COMPLETED").length,
    noShow: retests.filter((r) => r.status === "NO_SHOW").length,
  };

  async function action(
    id: string,
    path: string,
    body?: Record<string, unknown>,
    successMsg?: string,
  ) {
    try {
      await api.post(`/api/v1/retests/${id}${path}`, body ?? {});
      setToast(successMsg ?? "Updated");
      load();
    } catch (e) {
      const err = e as { response?: { data?: { title?: string } } };
      setToast(err.response?.data?.title ?? "Failed");
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl tracking-tight">Retests</h1>
          <p className="text-text-muted text-sm mt-1">
            Auto-generated from failed exam results · schedule, track, and enter retest marks
          </p>
        </div>
      </div>

      <div className="border-b border-border-soft mb-6 flex gap-1 overflow-x-auto">
        <TabBtn active={tab === "all"} onClick={() => setTab("all")} count={counts.all}>
          All
        </TabBtn>
        <TabBtn
          active={tab === "pending"}
          onClick={() => setTab("pending")}
          count={counts.pending}
          tone="warning"
        >
          Pending Schedule
        </TabBtn>
        <TabBtn
          active={tab === "scheduled"}
          onClick={() => setTab("scheduled")}
          count={counts.scheduled}
          tone="info"
        >
          Scheduled
        </TabBtn>
        <TabBtn
          active={tab === "today"}
          onClick={() => setTab("today")}
          count={counts.today}
          tone="accent"
        >
          Today
        </TabBtn>
        <TabBtn
          active={tab === "completed"}
          onClick={() => setTab("completed")}
          count={counts.completed}
          tone="success"
        >
          Completed
        </TabBtn>
        <TabBtn
          active={tab === "no-show"}
          onClick={() => setTab("no-show")}
          count={counts.noShow}
          tone="danger"
        >
          No-Show
        </TabBtn>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <select
          value={filterBatch}
          onChange={(e) => setFilterBatch(e.target.value)}
          className="text-sm rounded-md border border-border-soft bg-white/92 px-3 py-2"
        >
          <option value="">All batches</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Search by student name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-sm rounded-md border border-border-soft bg-white/92 px-3 py-2 min-w-[240px]"
        />
      </div>

      {loading ? (
        <div className="text-xs text-text-dim">Loading retests...</div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel p-10 text-center text-sm text-text-dim">
          No retests in this view.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((r) => (
            <RetestCard
              key={r.id}
              retest={r}
              onSchedule={() => setScheduleTarget(r)}
              onReschedule={() => setScheduleTarget(r)}
              onMarkAttended={() =>
                action(
                  r.id,
                  "/mark-attendance",
                  { attendedAt: new Date().toISOString() },
                  "Marked attended",
                )
              }
              onNoShow={() => action(r.id, "/no-show", undefined, "Marked as no-show")}
              onCancel={() => action(r.id, "/cancel", undefined, "Cancelled")}
              onEnterMarks={() => setMarksTarget(r)}
            />
          ))}
        </div>
      )}

      {scheduleTarget && (
        <ScheduleRetestModal
          retest={scheduleTarget}
          onClose={() => setScheduleTarget(null)}
          onDone={() => {
            setScheduleTarget(null);
            setToast("Retest scheduled");
            load();
          }}
        />
      )}

      {marksTarget && (
        <EnterRetestMarksModal
          retest={marksTarget}
          onClose={() => setMarksTarget(null)}
          onDone={() => {
            setMarksTarget(null);
            setToast("Retest marks saved");
            load();
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 rounded-md bg-text-primary text-white text-xs px-4 py-2.5 shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  count,
  tone,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  tone?: "warning" | "info" | "accent" | "success" | "danger";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap inline-flex items-center gap-2 ${
        active
          ? "border-indigo text-text-primary"
          : "border-transparent text-text-muted hover:text-text-primary"
      }`}
    >
      <span>{children}</span>
      <Badge tone={tone ?? "neutral"}>{count}</Badge>
    </button>
  );
}
