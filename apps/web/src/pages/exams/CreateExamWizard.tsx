import { Button, Input, SmartDateInput } from "@/components/primitives";
import { api } from "@/lib/api";
import { Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { CutOffType, ExamType } from "./ExamsPage";

interface Batch {
  id: string;
  name: string;
  batchSubjects?: Array<{ subject: { id: string; name: string } }>;
}
interface Subject {
  id: string;
  name: string;
}

interface WizardData {
  batchId: string;
  subjectId: string;
  name: string;
  description: string;
  type: ExamType;
  totalMarks: string;
  cutOffType: CutOffType;
  passingMarks: string;
  passingPercent: string;
  totalQuestions: string;
  marksPerCorrect: string;
  marksPerWrong: string;
  marksPerUnattempted: string;
  theoryMaxMarks: string;
  mcqMaxMarks: string;
  mcqQuestionCount: string;
  examDate: string;
  startTime: string;
  endTime: string;
  duration: string;
}

const initial: WizardData = {
  batchId: "",
  subjectId: "",
  name: "",
  description: "",
  type: "THEORY",
  totalMarks: "",
  cutOffType: "PERCENTAGE",
  passingMarks: "",
  passingPercent: "40",
  totalQuestions: "",
  marksPerCorrect: "4",
  marksPerWrong: "1",
  marksPerUnattempted: "0",
  theoryMaxMarks: "",
  mcqMaxMarks: "",
  mcqQuestionCount: "",
  examDate: "",
  startTime: "09:00",
  endTime: "",
  duration: "",
};

const TYPE_DESCRIPTIONS: Record<ExamType, { label: string; hint: string }> = {
  THEORY: { label: "Theory", hint: "Written long-answer exam" },
  MCQ: { label: "MCQ", hint: "Multiple choice questions only" },
  THEORY_MCQ: { label: "Theory + MCQ", hint: "Combined paper with both sections" },
  OBJECTIVE: { label: "Objective", hint: "Short answer / fill-in-the-blank" },
  NUMERICAL: { label: "Numerical", hint: "Numerical problem solving" },
};

export function CreateExamWizard({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(initial);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [suggestHint, setSuggestHint] = useState("");

  useEffect(() => {
    api
      .get("/api/v1/batches")
      .then((r) => setBatches(r.data.data as Batch[]))
      .catch(() => setBatches([]));
    api
      .get("/api/v1/subjects")
      .then((r) => setSubjects(r.data.data as Subject[]))
      .catch(() => setSubjects([]));
  }, []);

  const hasMcq = data.type === "MCQ" || data.type === "THEORY_MCQ";
  const isCombined = data.type === "THEORY_MCQ";

  const mcqMaxPreview = useMemo(() => {
    const q = Number(data.totalQuestions || data.mcqQuestionCount || 0);
    const mpc = Number(data.marksPerCorrect || 0);
    return q > 0 && mpc > 0 ? `${q} × ${mpc} = ${q * mpc} max` : "";
  }, [data.totalQuestions, data.mcqQuestionCount, data.marksPerCorrect]);

  const totalSections = isCombined
    ? (Number(data.theoryMaxMarks || 0) + Number(data.mcqMaxMarks || 0)).toFixed(0)
    : null;

  function set<K extends keyof WizardData>(k: K, v: WizardData[K]) {
    setData((d) => ({ ...d, [k]: v }));
  }

  async function suggestDate() {
    if (!data.batchId) return;
    try {
      const r = await api.get("/api/v1/exams/suggest-date", { params: { batchId: data.batchId } });
      const { suggestedDate, reason } = r.data.data as {
        suggestedDate: string | null;
        reason: string;
      };
      if (suggestedDate) {
        set("examDate", suggestedDate);
        setSuggestHint(reason);
      } else {
        setSuggestHint(reason);
      }
    } catch {
      setSuggestHint("Could not fetch suggestion");
    }
  }

  function canNext(): boolean {
    if (step === 1) return !!data.batchId && !!data.name.trim();
    if (step === 2) {
      if (!data.totalMarks || Number(data.totalMarks) <= 0) return false;
      if (data.cutOffType === "PERCENTAGE" && data.passingPercent === "") return false;
      if (data.cutOffType === "MARKS" && data.passingMarks === "") return false;
      return true;
    }
    if (step === 3) {
      if (!hasMcq) return true;
      if (!data.totalQuestions || Number(data.totalQuestions) < 1) return false;
      if (!data.marksPerCorrect || Number(data.marksPerCorrect) <= 0) return false;
      if (isCombined) {
        const t = Number(data.theoryMaxMarks || 0);
        const m = Number(data.mcqMaxMarks || 0);
        if (t + m !== Number(data.totalMarks)) return false;
      }
      return true;
    }
    return true;
  }

  async function submit() {
    setError("");
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        batchId: data.batchId,
        subjectId: data.subjectId || null,
        name: data.name.trim(),
        description: data.description.trim() || undefined,
        type: data.type,
        totalMarks: Number(data.totalMarks),
        cutOffType: data.cutOffType,
      };
      if (data.cutOffType === "MARKS") body.passingMarks = Number(data.passingMarks);
      else body.passingPercent = Number(data.passingPercent);

      if (hasMcq) {
        body.totalQuestions = Number(data.totalQuestions || data.mcqQuestionCount);
        body.marksPerCorrect = Number(data.marksPerCorrect);
        body.marksPerWrong = Number(data.marksPerWrong);
        body.marksPerUnattempted = Number(data.marksPerUnattempted || 0);
      }
      if (isCombined) {
        body.theoryMaxMarks = Number(data.theoryMaxMarks);
        body.mcqMaxMarks = Number(data.mcqMaxMarks);
        body.mcqQuestionCount = Number(data.totalQuestions || data.mcqQuestionCount);
      }
      if (data.examDate) body.examDate = data.examDate;
      if (data.startTime) body.startTime = data.startTime;
      if (data.endTime) body.endTime = data.endTime;
      if (data.duration) body.duration = Number(data.duration);

      await api.post("/api/v1/exams", body);
      onCreated();
    } catch (e) {
      const err = e as { response?: { data?: { title?: string } } };
      setError(err.response?.data?.title ?? "Failed to create exam");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto p-4">
      <div className="glass-panel w-full max-w-2xl mt-12 relative">
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-3 right-3 text-text-muted hover:text-text-primary"
        >
          <X size={18} />
        </button>
        <div className="p-6 border-b border-border-soft">
          <h2 className="font-display text-lg">Create exam</h2>
          <div className="flex gap-2 mt-3">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  n <= step ? "bg-indigo" : "bg-border-soft"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-text-dim mt-2">
            Step {step} of 4 —{" "}
            {step === 1
              ? "Basic info"
              : step === 2
                ? "Type & marks"
                : step === 3
                  ? "Configuration"
                  : "Schedule"}
          </p>
        </div>

        <div className="p-6 space-y-4 max-h-[55vh] overflow-y-auto">
          {step === 1 && (
            <>
              <Input
                label="Exam name"
                value={data.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Unit Test 3 — Organic Chemistry"
              />
              <div>
                <label
                  htmlFor="exam-description"
                  className="mb-1.5 block text-xs font-medium text-text-muted"
                >
                  Description (optional)
                </label>
                <textarea
                  id="exam-description"
                  value={data.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-border-soft bg-white/92 px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-dim outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/15"
                />
              </div>
              <div>
                <label
                  htmlFor="exam-batch"
                  className="mb-1.5 block text-xs font-medium text-text-muted"
                >
                  Batch
                </label>
                <select
                  id="exam-batch"
                  value={data.batchId}
                  onChange={(e) => set("batchId", e.target.value)}
                  className="w-full text-sm rounded-md border border-border-soft bg-white/92 px-3.5 py-2.5"
                >
                  <option value="">— Select batch —</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="exam-subject"
                  className="mb-1.5 block text-xs font-medium text-text-muted"
                >
                  Subject
                </label>
                <select
                  id="exam-subject"
                  value={data.subjectId}
                  onChange={(e) => set("subjectId", e.target.value)}
                  className="w-full text-sm rounded-md border border-border-soft bg-white/92 px-3.5 py-2.5"
                >
                  <option value="">All subjects (multi-subject)</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(Object.keys(TYPE_DESCRIPTIONS) as ExamType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set("type", t)}
                    className={`text-left p-3 rounded-md border transition-colors ${
                      data.type === t
                        ? "border-indigo bg-indigo/5"
                        : "border-border-soft hover:bg-white/60"
                    }`}
                  >
                    <div className="text-sm font-medium text-text-primary">
                      {TYPE_DESCRIPTIONS[t].label}
                    </div>
                    <div className="text-2xs text-text-dim mt-0.5">{TYPE_DESCRIPTIONS[t].hint}</div>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Total marks"
                  type="number"
                  value={data.totalMarks}
                  onChange={(e) => set("totalMarks", e.target.value)}
                />
                <div>
                  <div className="mb-1.5 text-xs font-medium text-text-muted">Cut-off type</div>
                  <div className="flex gap-1 rounded-md border border-border-soft p-0.5 bg-white/70 w-fit">
                    <button
                      type="button"
                      onClick={() => set("cutOffType", "MARKS")}
                      className={`px-3 py-1.5 text-xs rounded ${
                        data.cutOffType === "MARKS" ? "bg-indigo text-white" : "text-text-muted"
                      }`}
                    >
                      Marks
                    </button>
                    <button
                      type="button"
                      onClick={() => set("cutOffType", "PERCENTAGE")}
                      className={`px-3 py-1.5 text-xs rounded ${
                        data.cutOffType === "PERCENTAGE"
                          ? "bg-indigo text-white"
                          : "text-text-muted"
                      }`}
                    >
                      Percentage
                    </button>
                  </div>
                </div>
              </div>
              {data.cutOffType === "MARKS" ? (
                <Input
                  label="Passing marks"
                  type="number"
                  value={data.passingMarks}
                  onChange={(e) => set("passingMarks", e.target.value)}
                />
              ) : (
                <Input
                  label="Passing percent"
                  type="number"
                  value={data.passingPercent}
                  onChange={(e) => set("passingPercent", e.target.value)}
                  suffix="%"
                />
              )}
            </>
          )}

          {step === 3 &&
            (hasMcq ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Total MCQ questions"
                    type="number"
                    value={data.totalQuestions}
                    onChange={(e) => set("totalQuestions", e.target.value)}
                  />
                  <Input
                    label="Marks per correct"
                    type="number"
                    value={data.marksPerCorrect}
                    onChange={(e) => set("marksPerCorrect", e.target.value)}
                  />
                  <Input
                    label="Negative per wrong"
                    type="number"
                    value={data.marksPerWrong}
                    onChange={(e) => set("marksPerWrong", e.target.value)}
                    hint={`Each wrong answer will deduct ${data.marksPerWrong || 0} mark`}
                  />
                  <Input
                    label="Marks for unattempted"
                    type="number"
                    value={data.marksPerUnattempted}
                    onChange={(e) => set("marksPerUnattempted", e.target.value)}
                  />
                </div>
                {mcqMaxPreview && (
                  <div className="text-xs text-text-muted px-3 py-2 rounded bg-indigo/5 border border-indigo/10">
                    {mcqMaxPreview}
                  </div>
                )}
                {isCombined && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Theory section max"
                      type="number"
                      value={data.theoryMaxMarks}
                      onChange={(e) => set("theoryMaxMarks", e.target.value)}
                    />
                    <Input
                      label="MCQ section max"
                      type="number"
                      value={data.mcqMaxMarks}
                      onChange={(e) => set("mcqMaxMarks", e.target.value)}
                    />
                    {totalSections != null && (
                      <div className="sm:col-span-2 text-xs text-text-muted">
                        Section total: {totalSections} (must equal {data.totalMarks})
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="text-xs text-text-muted">
                No extra configuration needed for this exam type — continue to schedule.
              </div>
            ))}

          {step === 4 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SmartDateInput
                  label="Exam date"
                  value={data.examDate}
                  onChange={(v) => set("examDate", v)}
                  hint="Type a date or 'next Monday'"
                />
                <div className="sm:pt-5">
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Sparkles size={12} />}
                    onClick={suggestDate}
                    disabled={!data.batchId}
                  >
                    Suggest date
                  </Button>
                </div>
                {suggestHint && (
                  <div className="sm:col-span-2 text-2xs text-text-dim">{suggestHint}</div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="Start time"
                  type="time"
                  value={data.startTime}
                  onChange={(e) => set("startTime", e.target.value)}
                />
                <Input
                  label="End time"
                  type="time"
                  value={data.endTime}
                  onChange={(e) => set("endTime", e.target.value)}
                />
                <Input
                  label="Duration (min)"
                  type="number"
                  value={data.duration}
                  onChange={(e) => set("duration", e.target.value)}
                />
              </div>
              <div className="glass-panel p-3 text-xs text-text-muted space-y-1">
                <div>
                  <span className="text-text-dim">Name: </span>
                  <span className="text-text-primary">{data.name || "—"}</span>
                </div>
                <div>
                  <span className="text-text-dim">Type: </span>
                  <span className="text-text-primary">{TYPE_DESCRIPTIONS[data.type].label}</span>
                </div>
                <div>
                  <span className="text-text-dim">Total marks: </span>
                  <span className="text-text-primary">{data.totalMarks || "—"}</span>
                </div>
                <div>
                  <span className="text-text-dim">Cut-off: </span>
                  <span className="text-text-primary">
                    {data.cutOffType === "MARKS"
                      ? `${data.passingMarks} marks`
                      : `${data.passingPercent}%`}
                  </span>
                </div>
              </div>
            </>
          )}

          {error && <div className="text-xs text-danger">{error}</div>}
        </div>

        <div className="p-4 border-t border-border-soft flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (step === 1 ? onClose() : setStep(step - 1))}
          >
            {step === 1 ? "Cancel" : "Back"}
          </Button>
          {step < 4 ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setStep(step + 1)}
              disabled={!canNext()}
            >
              Next
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={submit}
              loading={submitting}
              disabled={submitting}
            >
              Create exam
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
