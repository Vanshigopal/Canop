import { Badge, Button, Input } from "@/components/primitives";
import { api } from "@/lib/api";
import { X } from "lucide-react";
import { useState } from "react";
import type { RetestRow } from "./RetestsPage";

export function EnterRetestMarksModal({
  retest,
  onClose,
  onDone,
}: {
  retest: RetestRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const [theory, setTheory] = useState("");
  const [correct, setCorrect] = useState("");
  const [incorrect, setIncorrect] = useState("");
  const [unattempted, setUnattempted] = useState("");
  const [marks, setMarks] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const exam = retest.exam;
  const isMcq = exam.type === "MCQ";
  const isCombined = exam.type === "THEORY_MCQ";
  const totalQ = exam.totalQuestions ?? exam.mcqQuestionCount ?? 0;

  let liveScore = 0;
  let liveValid = true;
  let liveMessage = "";

  if (isMcq) {
    const c = Number(correct || 0);
    const w = Number(incorrect || 0);
    const u = Number(unattempted || 0);
    const sum = c + w + u;
    liveScore =
      c * (exam.marksPerCorrect ?? 0) +
      w * (exam.marksPerWrong ?? 0) +
      u * (exam.marksPerUnattempted ?? 0);
    liveValid = sum === totalQ && correct !== "" && incorrect !== "" && unattempted !== "";
    liveMessage = sum !== totalQ ? `Must sum to ${totalQ} (currently ${sum})` : "";
  } else if (isCombined) {
    const t = Number(theory || 0);
    const c = Number(correct || 0);
    const w = Number(incorrect || 0);
    const u = Number(unattempted || 0);
    const sum = c + w + u;
    const mcqScore =
      c * (exam.marksPerCorrect ?? 0) +
      w * (exam.marksPerWrong ?? 0) +
      u * (exam.marksPerUnattempted ?? 0);
    liveScore = t + mcqScore;
    liveValid =
      sum === totalQ &&
      theory !== "" &&
      correct !== "" &&
      incorrect !== "" &&
      unattempted !== "" &&
      t <= (exam.theoryMaxMarks ?? exam.totalMarks);
    liveMessage = sum !== totalQ ? `MCQ counts must sum to ${totalQ}` : "";
  } else {
    liveScore = Number(marks || 0);
    liveValid = marks !== "" && liveScore >= 0 && liveScore <= exam.totalMarks;
    liveMessage = !liveValid && marks !== "" ? `Marks must be 0..${exam.totalMarks}` : "";
  }

  const livePct = exam.totalMarks > 0 ? Math.round((liveScore / exam.totalMarks) * 10000) / 100 : 0;
  const passThreshold =
    exam.cutOffType === "MARKS" ? (exam.passingMarks ?? 0) : (exam.passingPercent ?? 0);
  const livePassed =
    exam.cutOffType === "MARKS"
      ? liveScore >= (exam.passingMarks ?? 0)
      : livePct >= (exam.passingPercent ?? 0);

  async function submit() {
    setError("");
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {};
      if (isMcq) {
        body.retestMcqCorrect = Number(correct);
        body.retestMcqIncorrect = Number(incorrect);
        body.retestMcqUnattempted = Number(unattempted);
      } else if (isCombined) {
        body.retestTheoryMarks = Number(theory);
        body.retestMcqCorrect = Number(correct);
        body.retestMcqIncorrect = Number(incorrect);
        body.retestMcqUnattempted = Number(unattempted);
      } else {
        body.retestMarks = Number(marks);
      }
      if (note) body.note = note;
      await api.post(`/api/v1/retests/${retest.id}/enter-marks`, body);
      onDone();
    } catch (e) {
      const err = e as { response?: { data?: { title?: string } } };
      setError(err.response?.data?.title ?? "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto p-4">
      <div className="glass-panel w-full max-w-lg mt-16 relative">
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-3 right-3 text-text-muted hover:text-text-primary"
        >
          <X size={18} />
        </button>
        <div className="p-5 border-b border-border-soft">
          <h2 className="font-display text-lg">Enter retest marks</h2>
          <p className="text-xs text-text-muted mt-1">
            {retest.student.user.name} · {retest.exam.name}
          </p>
          <p className="text-2xs text-text-dim mt-2">
            Original: {retest.originalMarks}/{exam.totalMarks} ({retest.originalPercentage}%) ·
            Cut-off:{" "}
            {retest.cutOffType === "MARKS" ? `${retest.cutOff} marks` : `${retest.cutOff}%`}
          </p>
        </div>
        <div className="p-5 space-y-3">
          {!isMcq && !isCombined && (
            <Input
              label={`Retest marks (/${exam.totalMarks})`}
              type="number"
              min={0}
              max={exam.totalMarks}
              value={marks}
              onChange={(e) => setMarks(e.target.value)}
            />
          )}

          {(isMcq || isCombined) && (
            <>
              {isCombined && (
                <Input
                  label={`Theory marks (/${exam.theoryMaxMarks ?? 0})`}
                  type="number"
                  value={theory}
                  onChange={(e) => setTheory(e.target.value)}
                />
              )}
              <div className="grid grid-cols-3 gap-2">
                <Input
                  label="Correct"
                  type="number"
                  value={correct}
                  onChange={(e) => setCorrect(e.target.value)}
                />
                <Input
                  label="Wrong"
                  type="number"
                  value={incorrect}
                  onChange={(e) => setIncorrect(e.target.value)}
                />
                <Input
                  label="Skip"
                  type="number"
                  value={unattempted}
                  onChange={(e) => setUnattempted(e.target.value)}
                />
              </div>
              <div className="text-2xs text-text-muted">
                Total questions: {totalQ} · Each correct: +{exam.marksPerCorrect ?? 0} · Each wrong:{" "}
                {exam.marksPerWrong ?? 0}
              </div>
            </>
          )}

          <div>
            <label
              htmlFor="retest-marks-note"
              className="mb-1.5 block text-xs font-medium text-text-muted"
            >
              Note (optional)
            </label>
            <textarea
              id="retest-marks-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-border-soft bg-white/92 px-3.5 py-2.5 text-sm text-text-primary outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/15"
            />
          </div>

          <div className="glass-panel p-3 flex items-center justify-between">
            <div>
              <div className="text-2xs uppercase tracking-wider text-text-dim">Live score</div>
              <div className="text-xl font-semibold text-text-primary">
                {liveValid ? `${liveScore.toFixed(1)}/${exam.totalMarks} (${livePct}%)` : "—"}
              </div>
              {liveMessage && <div className="text-2xs text-danger mt-0.5">{liveMessage}</div>}
            </div>
            {liveValid && (
              <Badge tone={livePassed ? "success" : "danger"}>
                {livePassed ? `Pass ≥ ${passThreshold}` : `Fail < ${passThreshold}`}
              </Badge>
            )}
          </div>

          {error && <div className="text-xs text-danger">{error}</div>}
        </div>
        <div className="p-4 border-t border-border-soft flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={submit}
            loading={submitting}
            disabled={submitting || !liveValid}
          >
            Save Retest Marks
          </Button>
        </div>
      </div>
    </div>
  );
}
