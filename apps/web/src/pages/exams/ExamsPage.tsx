import { Badge, Button } from "@/components/primitives";
import { useSocket } from "@/hooks/useSocket";
import { api } from "@/lib/api";
import { BarChart3, FileText, GraduationCap, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { CreateExamWizard } from "./CreateExamWizard";
import { ExamResultsTab } from "./ExamResultsTab";
import { MarksEntryTab } from "./MarksEntryTab";

export type ExamType = "THEORY" | "MCQ" | "THEORY_MCQ" | "OBJECTIVE" | "NUMERICAL";
export type ExamStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "MARKS_ENTRY"
  | "UNDER_REVIEW"
  | "PUBLISHED"
  | "CANCELLED";
export type CutOffType = "MARKS" | "PERCENTAGE";

export interface ExamRow {
  id: string;
  name: string;
  type: ExamType;
  status: ExamStatus;
  totalMarks: number | string;
  passingMarks: number | string | null;
  passingPercent: number | string | null;
  cutOffType: CutOffType;
  totalQuestions: number | null;
  marksPerCorrect: number | string | null;
  marksPerWrong: number | string | null;
  marksPerUnattempted: number | string | null;
  theoryMaxMarks: number | string | null;
  mcqMaxMarks: number | string | null;
  mcqQuestionCount: number | null;
  examDate: string | null;
  startTime: string | null;
  endTime: string | null;
  duration: number | null;
  description: string | null;
  batch: { id: string; name: string };
  subject: { id: string; name: string } | null;
  createdBy: { id: string; name: string };
  _count?: { markEntries: number };
}

type Tab = "list" | "marks" | "results";

const EXAM_TYPE_LABEL: Record<ExamType, string> = {
  THEORY: "Theory",
  MCQ: "MCQ",
  THEORY_MCQ: "Theory + MCQ",
  OBJECTIVE: "Objective",
  NUMERICAL: "Numerical",
};

const STATUS_TONE: Record<
  ExamStatus,
  "neutral" | "info" | "accent" | "warning" | "success" | "danger"
> = {
  DRAFT: "neutral",
  SCHEDULED: "info",
  IN_PROGRESS: "accent",
  MARKS_ENTRY: "warning",
  UNDER_REVIEW: "accent",
  PUBLISHED: "success",
  CANCELLED: "danger",
};

export function ExamsPage() {
  const [tab, setTab] = useState<Tab>("list");
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [filterBatch, setFilterBatch] = useState("");
  const [filterStatus, setFilterStatus] = useState<ExamStatus | "">("");
  const [toast, setToast] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (filterBatch) params.batchId = filterBatch;
    if (filterStatus) params.status = filterStatus;
    api
      .get("/api/v1/exams", { params })
      .then((r) => setExams(r.data.data as ExamRow[]))
      .catch(() => setExams([]))
      .finally(() => setLoading(false));
  }, [filterBatch, filterStatus]);

  useEffect(() => {
    load();
  }, [load]);

  useSocket<{ examId: string }>("exam:created", load);
  useSocket<{ examId: string }>("exam:updated", load);
  useSocket<{ examId: string }>("exam:published", load);
  useSocket<{ examId: string }>("exam:deleted", load);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl tracking-tight">Exams</h1>
          <p className="text-text-muted text-sm mt-1">
            Create exams, enter marks, and publish results
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus size={14} />}
          onClick={() => setWizardOpen(true)}
        >
          Create Exam
        </Button>
      </div>

      <div className="border-b border-border-soft mb-6 flex gap-1 overflow-x-auto">
        <TabBtn
          active={tab === "list"}
          onClick={() => setTab("list")}
          icon={<FileText size={14} />}
        >
          All Exams
        </TabBtn>
        <TabBtn
          active={tab === "marks"}
          onClick={() => setTab("marks")}
          icon={<GraduationCap size={14} />}
        >
          Marks Entry
        </TabBtn>
        <TabBtn
          active={tab === "results"}
          onClick={() => setTab("results")}
          icon={<BarChart3 size={14} />}
        >
          Results
        </TabBtn>
      </div>

      {tab === "list" && (
        <AllExamsTab
          exams={exams}
          loading={loading}
          filterBatch={filterBatch}
          filterStatus={filterStatus}
          setFilterBatch={setFilterBatch}
          setFilterStatus={setFilterStatus}
        />
      )}
      {tab === "marks" && <MarksEntryTab exams={exams} onSaved={() => setToast("Marks saved")} />}
      {tab === "results" && (
        <ExamResultsTab
          exams={exams}
          onPublished={() => setToast("Results published")}
          onRefresh={load}
        />
      )}

      {wizardOpen && (
        <CreateExamWizard
          onClose={() => setWizardOpen(false)}
          onCreated={() => {
            setWizardOpen(false);
            setToast("Exam created");
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

function AllExamsTab(props: {
  exams: ExamRow[];
  loading: boolean;
  filterBatch: string;
  filterStatus: ExamStatus | "";
  setFilterBatch: (s: string) => void;
  setFilterStatus: (s: ExamStatus | "") => void;
}) {
  const { exams, loading, filterBatch, filterStatus, setFilterBatch, setFilterStatus } = props;
  const [batches, setBatches] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    api
      .get("/api/v1/batches")
      .then((r) => setBatches(r.data.data as Array<{ id: string; name: string }>))
      .catch(() => setBatches([]));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
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
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as ExamStatus | "")}
          className="text-sm rounded-md border border-border-soft bg-white/92 px-3 py-2"
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="MARKS_ENTRY">Marks Entry</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="PUBLISHED">Published</option>
        </select>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-soft text-left text-text-dim">
                <th className="px-4 py-2.5 font-medium">Exam</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">Batch</th>
                <th className="px-4 py-2.5 font-medium">Subject</th>
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium">Total</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-text-dim text-xs">
                    Loading...
                  </td>
                </tr>
              )}
              {!loading && exams.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-text-dim text-xs">
                    No exams yet. Create one to get started.
                  </td>
                </tr>
              )}
              {exams.map((e) => (
                <tr key={e.id} className="border-b border-border-soft last:border-0">
                  <td className="px-4 py-3 text-text-primary">{e.name}</td>
                  <td className="px-4 py-3 text-text-muted">
                    <Badge tone="neutral">{EXAM_TYPE_LABEL[e.type]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{e.batch.name}</td>
                  <td className="px-4 py-3 text-text-muted">{e.subject?.name ?? "All subjects"}</td>
                  <td className="px-4 py-3 text-text-muted font-mono text-xs">
                    {e.examDate ? e.examDate.slice(0, 10) : "—"}
                  </td>
                  <td className="px-4 py-3 text-text-muted">{Number(e.totalMarks)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[e.status]}>{e.status.replace(/_/g, " ")}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap inline-flex items-center gap-1.5 ${
        active
          ? "border-indigo text-text-primary"
          : "border-transparent text-text-muted hover:text-text-primary"
      }`}
    >
      {icon} {children}
    </button>
  );
}

export { EXAM_TYPE_LABEL, STATUS_TONE };
