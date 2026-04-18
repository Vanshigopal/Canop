import { Badge, Button } from "@/components/primitives";
import { api } from "@/lib/api";
import {
  AlertTriangle,
  Check,
  FileText,
  ScanLine,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface Exam {
  id: string;
  name: string;
  status: string;
  type: string;
  totalQuestions: number | null;
  totalMarks: number | string;
  marksPerCorrect: number | string | null;
  marksPerWrong: number | string | null;
  marksPerUnattempted: number | string | null;
  batch: { id: string; name: string } | null;
  subject: { id: string; name: string } | null;
}

interface Student {
  id: string;
  user: { name: string };
  rollNumber: string | null;
}

interface ScanResponse {
  total_questions: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  score: number;
  positive_marks: number;
  negative_marks: number;
  roll_number: string | null;
  responses: Array<{
    question_number: number;
    selected_option: number | null;
    confidence: number;
    filled_ratio: number;
  }>;
  flagged_questions: number[];
  needs_review: boolean;
}

const OPTIONS = ["A", "B", "C", "D"];

export function OmrPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [examId, setExamId] = useState<string>("");
  const [studentId, setStudentId] = useState<string>("");
  const [answerKey, setAnswerKey] = useState<Record<number, number>>({});
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [error, setError] = useState("");

  const selectedExam = useMemo(
    () => exams.find((e) => e.id === examId) ?? null,
    [exams, examId],
  );

  useEffect(() => {
    api.get("/api/v1/exams").then((r) => {
      const mcqExams = (r.data.data as Exam[]).filter(
        (e) =>
          (e.type === "MCQ" || e.type === "THEORY_MCQ") &&
          e.totalQuestions &&
          e.marksPerCorrect !== null,
      );
      setExams(mcqExams);
    });
  }, []);

  useEffect(() => {
    if (!selectedExam?.batch?.id) {
      setStudents([]);
      return;
    }
    api
      .get(`/api/v1/students?batchId=${selectedExam.batch.id}&pageSize=100`)
      .then((r) => setStudents(r.data.data));
    setResult(null);
    setAnswerKey({});
  }, [selectedExam?.batch?.id]);

  function handleFile(f: File | null) {
    setFile(f);
    setResult(null);
    setError("");
    if (f && f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  }

  function setAnswer(q: number, option: number) {
    setAnswerKey((prev) => ({ ...prev, [q]: option }));
  }

  const answerKeyComplete =
    selectedExam?.totalQuestions &&
    Object.keys(answerKey).length === selectedExam.totalQuestions;

  async function scan() {
    if (!file || !selectedExam || !studentId) return;
    setScanning(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("examId", selectedExam.id);
      form.append("studentId", studentId);
      form.append("answerKey", JSON.stringify(answerKey));

      const r = await api.post("/api/v1/omr/scan", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(r.data.data);
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { error?: { message?: string } } } };
      setError(
        anyErr?.response?.data?.error?.message ??
          "Scan failed — check that the ML service is running.",
      );
    } finally {
      setScanning(false);
    }
  }

  async function confirmFlagged() {
    if (!result || !selectedExam || !studentId) return;
    setScanning(true);
    try {
      await api.post("/api/v1/omr/confirm", {
        examId: selectedExam.id,
        studentId,
        marksObtained: result.score,
        correct: result.correct,
        incorrect: result.incorrect,
        unattempted: result.unattempted,
      });
      setResult({ ...result, needs_review: false });
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <ScanLine size={22} className="text-indigo" />
        <h1 className="font-display text-2xl">OMR Scanner</h1>
      </div>

      <div className="glass-panel p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="exam-select" className="mb-1.5 block text-xs font-medium text-text-muted">
              Exam
            </label>
            <select
              id="exam-select"
              value={examId}
              onChange={(e) => setExamId(e.target.value)}
              className="w-full rounded-md border border-border-soft bg-white/92 px-3.5 py-2.5 text-sm"
            >
              <option value="">Select an MCQ exam…</option>
              {exams.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} · {e.batch?.name ?? "—"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="student-select" className="mb-1.5 block text-xs font-medium text-text-muted">
              Student
            </label>
            <select
              id="student-select"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              disabled={!selectedExam}
              className="w-full rounded-md border border-border-soft bg-white/92 px-3.5 py-2.5 text-sm disabled:opacity-50"
            >
              <option value="">Select a student…</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.rollNumber ? `#${s.rollNumber} · ` : ""}
                  {s.user.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedExam && (
          <div className="text-xs text-text-muted">
            <span className="font-mono">{selectedExam.totalQuestions}</span> questions ·
            <span className="font-mono mx-1">+{Number(selectedExam.marksPerCorrect)}</span>/correct
            <span className="font-mono mx-1">{Number(selectedExam.marksPerWrong)}</span>/wrong
          </div>
        )}
      </div>

      {selectedExam && (
        <AnswerKeyGrid
          totalQuestions={selectedExam.totalQuestions!}
          answerKey={answerKey}
          setAnswer={setAnswer}
        />
      )}

      <div className="glass-panel p-5">
        <div className="mb-3 text-2xs uppercase tracking-wider text-text-dim">Upload bubble sheet</div>
        <label
          htmlFor="omr-file"
          className="block cursor-pointer rounded-xl border-2 border-dashed border-border-soft bg-white/40 p-6 text-center hover:bg-white/60 transition-colors"
        >
          {preview ? (
            <img src={preview} alt="preview" className="mx-auto max-h-64 rounded" />
          ) : (
            <>
              <Upload size={22} className="mx-auto text-text-dim mb-2" />
              <div className="text-sm text-text-muted">
                Drop a JPEG/PNG bubble sheet here, or click to browse
              </div>
              <div className="text-2xs text-text-dim mt-1">Max 10 MB</div>
            </>
          )}
          <input
            id="omr-file"
            type="file"
            accept="image/jpeg,image/png,image/jpg"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
        </label>
        {file && (
          <div className="mt-2 text-xs text-text-muted flex items-center gap-2">
            <FileText size={13} />
            {file.name} ({Math.round(file.size / 1024)} KB)
            <button
              type="button"
              onClick={() => handleFile(null)}
              className="text-danger hover:opacity-80"
            >
              <X size={13} />
            </button>
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <Button
            onClick={scan}
            disabled={!file || !selectedExam || !studentId || !answerKeyComplete}
            loading={scanning}
          >
            <ScanLine size={14} /> Scan Sheet
          </Button>
          {!answerKeyComplete && selectedExam && (
            <span className="text-2xs text-warning">
              Fill in all {selectedExam.totalQuestions} answer-key cells first.
            </span>
          )}
          {error && <span className="text-2xs text-danger">{error}</span>}
        </div>
      </div>

      {result && (
        <ScanResult
          result={result}
          exam={selectedExam!}
          onConfirm={confirmFlagged}
        />
      )}
    </div>
  );
}

function AnswerKeyGrid({
  totalQuestions,
  answerKey,
  setAnswer,
}: {
  totalQuestions: number;
  answerKey: Record<number, number>;
  setAnswer: (q: number, o: number) => void;
}) {
  return (
    <div className="glass-panel p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-2xs uppercase tracking-wider text-text-dim">Answer key</div>
        <span className="text-2xs text-text-dim">
          {Object.keys(answerKey).length} / {totalQuestions} filled
        </span>
      </div>
      <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
        {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((q) => (
          <div key={q} className="text-center">
            <div className="text-2xs text-text-dim mb-0.5 font-mono">Q{q}</div>
            <div className="flex flex-col gap-0.5">
              {OPTIONS.map((opt, idx) => {
                const selected = answerKey[q] === idx + 1;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setAnswer(q, idx + 1)}
                    className={`text-2xs py-1 rounded transition-colors ${
                      selected
                        ? "bg-indigo text-white"
                        : "bg-white/60 text-text-muted hover:bg-white"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScanResult({
  result,
  exam,
  onConfirm,
}: {
  result: ScanResponse;
  exam: Exam;
  onConfirm: () => void;
}) {
  const total = Number(exam.totalMarks);
  const percentage = total > 0 ? (result.score / total) * 100 : 0;

  return (
    <div className="glass-panel p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <div className="text-2xs uppercase tracking-wider text-text-dim">Scan result</div>
          <div className="text-3xl font-display mt-1 tabular-nums">
            {result.score.toFixed(1)} / {total}
          </div>
          <div className="text-sm text-text-muted">{percentage.toFixed(1)}%</div>
        </div>
        <div>
          {result.needs_review ? (
            <Badge tone="warning">
              <AlertTriangle size={11} /> Needs review
            </Badge>
          ) : (
            <Badge tone="success">
              <Check size={11} /> Saved to gradebook
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4 text-sm">
        <Stat label="Correct" value={result.correct} tone="success" />
        <Stat label="Incorrect" value={result.incorrect} tone="danger" />
        <Stat label="Skipped" value={result.unattempted} tone="neutral" />
      </div>

      <div className="text-2xs text-text-dim font-mono">
        ({result.correct} × {Number(exam.marksPerCorrect)}) +
        ({result.incorrect} × {Number(exam.marksPerWrong)}) = {result.score.toFixed(1)}
      </div>

      {result.flagged_questions.length > 0 && (
        <div className="mt-4 p-3 rounded-md bg-warning/10 border border-warning/20">
          <div className="text-xs font-medium text-warning mb-1">
            {result.flagged_questions.length} questions flagged for review
          </div>
          <div className="text-2xs text-text-muted mb-2">
            Q: {result.flagged_questions.slice(0, 20).join(", ")}
            {result.flagged_questions.length > 20 ? "…" : ""}
          </div>
          <Button size="sm" onClick={onConfirm}>
            Confirm and save
          </Button>
        </div>
      )}

      <details className="mt-4">
        <summary className="text-xs text-text-muted cursor-pointer">
          Per-question responses ({result.responses.length})
        </summary>
        <div className="mt-2 max-h-64 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="text-text-dim">
              <tr>
                <th className="text-left px-2 py-1">Q</th>
                <th className="text-left px-2 py-1">Selected</th>
                <th className="text-left px-2 py-1">Confidence</th>
                <th className="text-left px-2 py-1">Fill</th>
              </tr>
            </thead>
            <tbody>
              {result.responses.map((r) => (
                <tr key={r.question_number} className="border-t border-border-soft">
                  <td className="px-2 py-1 font-mono">{r.question_number}</td>
                  <td className="px-2 py-1">
                    {r.selected_option ? OPTIONS[r.selected_option - 1] : "—"}
                  </td>
                  <td className="px-2 py-1">{(r.confidence * 100).toFixed(0)}%</td>
                  <td className="px-2 py-1">{(r.filled_ratio * 100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "danger" | "neutral";
}) {
  const cls =
    tone === "success"
      ? "text-emerald-700"
      : tone === "danger"
        ? "text-red-700"
        : "text-text-muted";
  return (
    <div className="glass-panel p-3 text-center">
      <div className="text-2xs uppercase tracking-wider text-text-dim">{label}</div>
      <div className={`text-xl font-semibold ${cls} tabular-nums`}>{value}</div>
    </div>
  );
}
