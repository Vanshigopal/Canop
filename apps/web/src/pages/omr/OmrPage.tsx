import { Badge, Button, CustomSelect } from "@/components/primitives";
import { api } from "@/lib/api";
import { Pencil, ScanLine, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

interface Exam {
  id: string;
  name: string;
  status: string;
  type: string;
  totalQuestions: number | null;
  totalMarks: number | string;
  marksPerCorrect: number | string | null;
  batch: { id: string; name: string } | null;
  subject: { id: string; name: string } | null;
}

interface AnswerKeyRow {
  id: string;
  examId: string;
  answers: Record<string, number>;
  createdAt: string;
  updatedAt: string;
  exam: {
    id: string;
    name: string;
    totalQuestions: number | null;
    batch: { id: string; name: string } | null;
  };
}

const OPTIONS = ["A", "B", "C", "D"];

export function OmrPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [savedKeys, setSavedKeys] = useState<AnswerKeyRow[]>([]);
  const [examId, setExamId] = useState("");
  const [answerKey, setAnswerKey] = useState<Record<number, number>>({});
  const [existingKeyId, setExistingKeyId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const selectedExam = useMemo(() => exams.find((e) => e.id === examId) ?? null, [exams, examId]);

  const loadSavedKeys = useCallback(() => {
    api
      .get("/api/v1/answer-keys")
      .then((r) => setSavedKeys(r.data.data as AnswerKeyRow[]))
      .catch(() => setSavedKeys([]));
  }, []);

  useEffect(() => {
    api.get("/api/v1/exams").then((r) => {
      const mcqExams = (r.data.data as Exam[]).filter(
        (e) => (e.type === "MCQ" || e.type === "THEORY_MCQ") && e.totalQuestions,
      );
      setExams(mcqExams);
    });
    loadSavedKeys();
  }, [loadSavedKeys]);

  useEffect(() => {
    if (!examId) {
      setAnswerKey({});
      setExistingKeyId(null);
      setEditMode(true);
      return;
    }
    api
      .get(`/api/v1/answer-keys/${examId}`)
      .then((r) => {
        const row = r.data.data as AnswerKeyRow;
        const parsed: Record<number, number> = {};
        for (const [k, v] of Object.entries(row.answers)) parsed[Number(k)] = Number(v);
        setAnswerKey(parsed);
        setExistingKeyId(row.id);
        setEditMode(false);
      })
      .catch(() => {
        setAnswerKey({});
        setExistingKeyId(null);
        setEditMode(true);
      });
  }, [examId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  function setAnswer(q: number, option: number) {
    if (!editMode) return;
    setAnswerKey((prev) => ({ ...prev, [q]: option }));
  }

  async function save() {
    if (!selectedExam) return;
    setSaving(true);
    try {
      if (existingKeyId) {
        await api.put(`/api/v1/answer-keys/${selectedExam.id}`, { answers: answerKey });
        setToast("Answer key updated");
      } else {
        const r = await api.post("/api/v1/answer-keys", {
          examId: selectedExam.id,
          answers: answerKey,
        });
        setExistingKeyId(r.data.data.id);
        setToast("Answer key saved");
      }
      setEditMode(false);
      loadSavedKeys();
    } catch (err) {
      const msg =
        (err as { response?: { data?: { title?: string } } }).response?.data?.title ??
        "Save failed";
      setToast(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(targetExamId: string) {
    if (!confirm("Delete this answer key? This cannot be undone.")) return;
    try {
      await api.delete(`/api/v1/answer-keys/${targetExamId}`);
      setToast("Answer key deleted");
      if (targetExamId === examId) {
        setAnswerKey({});
        setExistingKeyId(null);
        setEditMode(true);
      }
      loadSavedKeys();
    } catch {
      setToast("Delete failed");
    }
  }

  const filledCount = Object.keys(answerKey).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <ScanLine size={22} className="text-indigo" />
        <div>
          <h1 className="font-display text-2xl tracking-tight">OMR</h1>
          <p className="text-sm text-text-muted">Manage answer keys for MCQ exams</p>
        </div>
      </div>

      {toast && (
        <div className="rounded-lg bg-success/10 border border-success/20 px-4 py-2 text-xs text-success">
          {toast}
        </div>
      )}

      <div className="glass-panel p-5">
        <CustomSelect
          label="Exam"
          value={examId}
          onChange={setExamId}
          placeholder="Select an MCQ exam"
          options={[
            { value: "", label: "Select an MCQ exam" },
            ...exams.map((e) => ({
              value: e.id,
              label: `${e.name} · ${e.batch?.name ?? "—"}`,
            })),
          ]}
        />
      </div>

      {!examId && savedKeys.length > 0 && (
        <div className="glass-panel overflow-hidden">
          <div className="px-5 py-3 border-b border-border-soft">
            <h2 className="font-display text-sm uppercase tracking-wider text-text-muted">
              Saved Answer Keys
            </h2>
          </div>
          <div className="divide-y divide-border-soft">
            {savedKeys.map((k) => (
              <div
                key={k.id}
                className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-white/40"
              >
                <div className="min-w-0">
                  <div className="font-medium text-text-primary truncate">
                    {k.exam.name} · {k.exam.batch?.name ?? "—"}
                  </div>
                  <div className="text-2xs text-text-dim mt-0.5 font-mono">
                    {k.exam.totalQuestions ?? Object.keys(k.answers).length} questions · Saved on{" "}
                    {new Date(k.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setExamId(k.examId);
                      setEditMode(false);
                    }}
                    className="px-2.5 py-1 rounded-md bg-white/80 border border-border-soft text-xs text-text-primary hover:bg-white"
                  >
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExamId(k.examId);
                      setEditMode(true);
                    }}
                    className="px-2.5 py-1 rounded-md bg-white/80 border border-border-soft text-xs text-text-primary hover:bg-white inline-flex items-center gap-1"
                  >
                    <Pencil size={11} /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(k.examId)}
                    className="px-2 py-1 rounded-md text-[#DC2626] hover:bg-[#FEF2F2]"
                    title="Delete answer key"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!examId && savedKeys.length === 0 && (
        <div className="glass-panel p-8 text-center text-sm text-text-dim">
          No answer keys saved yet
        </div>
      )}

      {selectedExam && (
        <>
          <div className="glass-panel p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-2xs uppercase tracking-wider text-text-dim font-semibold">
                Answer Key
              </div>
              <div className="flex items-center gap-3">
                {existingKeyId && !editMode && <Badge tone="success">Saved</Badge>}
                <span className="text-xs text-text-muted tabular-nums">
                  {filledCount} / {selectedExam.totalQuestions} filled
                </span>
              </div>
            </div>
            <AnswerKeyGrid
              totalQuestions={selectedExam.totalQuestions!}
              answerKey={answerKey}
              setAnswer={setAnswer}
              disabled={!editMode}
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            {existingKeyId && !editMode ? (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Pencil size={14} />}
                  onClick={() => setEditMode(true)}
                >
                  Edit Answer Key
                </Button>
                <button
                  type="button"
                  onClick={() => handleDelete(selectedExam.id)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md bg-white/80 border border-[#DC2626]/30 text-[#DC2626] hover:bg-[#FEF2F2]"
                >
                  <Trash2 size={12} /> Delete Answer Key
                </button>
              </>
            ) : (
              <>
                {existingKeyId && (
                  <Button variant="secondary" size="sm" onClick={() => setEditMode(false)}>
                    Cancel
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={save}
                  loading={saving}
                  disabled={filledCount !== selectedExam.totalQuestions}
                >
                  {existingKeyId ? "Update Answer Key" : "Save Answer Key"}
                </Button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function AnswerKeyGrid({
  totalQuestions,
  answerKey,
  setAnswer,
  disabled,
}: {
  totalQuestions: number;
  answerKey: Record<number, number>;
  setAnswer: (q: number, o: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="grid grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-3">
      {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((q) => (
        <div key={q} className="text-center">
          <div
            className="mb-1.5 font-semibold"
            style={{ fontSize: 15, color: "#2C2C2A", lineHeight: 1.1 }}
          >
            Q{q}
          </div>
          <div className="flex flex-col gap-1.5 items-center">
            {OPTIONS.map((opt, idx) => {
              const selected = answerKey[q] === idx + 1;
              return (
                <button
                  key={opt}
                  type="button"
                  disabled={disabled}
                  onClick={() => setAnswer(q, idx + 1)}
                  title={`Question ${q} – ${opt}`}
                  className="transition-all duration-150"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 600,
                    color: selected ? "#FFFFFF" : "#2C2C2A",
                    background: selected ? "#4F46E5" : "transparent",
                    border: selected ? "1.5px solid #4F46E5" : "1.5px solid #E8E3DA",
                    cursor: disabled ? "not-allowed" : "pointer",
                    opacity: disabled ? 0.8 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!selected && !disabled) {
                      e.currentTarget.style.background = "#FAF7F2";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!selected && !disabled) {
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
