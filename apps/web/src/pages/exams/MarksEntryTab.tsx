import { Badge, Button } from "@/components/primitives";
import { api } from "@/lib/api";
import { Save, Send, UserX } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { ExamRow, ExamStatus, ExamType } from "./ExamsPage";

interface MarkRow {
  studentId: string;
  studentName: string;
  rollNumber: string | null;
  entry: {
    id: string;
    marksObtained: number | null;
    percentage: number | null;
    grade: string | null;
    isPassed: boolean | null;
    isAbsent: boolean;
    theoryMarks: number | null;
    mcqCorrect: number | null;
    mcqIncorrect: number | null;
    mcqUnattempted: number | null;
    note: string | null;
  } | null;
}

interface ExamMeta {
  id: string;
  name: string;
  type: ExamType;
  status: ExamStatus;
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
}

interface LocalRow {
  studentId: string;
  studentName: string;
  rollNumber: string | null;
  marksObtained: string;
  theoryMarks: string;
  mcqCorrect: string;
  mcqIncorrect: string;
  mcqUnattempted: string;
  isAbsent: boolean;
  note: string;
  dirty: boolean;
  saving: boolean;
  error: string;
}

function toStr(v: number | null | undefined): string {
  return v == null ? "" : String(v);
}

export function MarksEntryTab({
  exams,
  onSaved,
}: {
  exams: ExamRow[];
  onSaved: () => void;
}) {
  const entryExams = exams.filter((e) =>
    ["MARKS_ENTRY", "IN_PROGRESS", "SCHEDULED", "DRAFT", "UNDER_REVIEW"].includes(e.status),
  );
  const [selectedId, setSelectedId] = useState("");
  const [meta, setMeta] = useState<ExamMeta | null>(null);
  const [rows, setRows] = useState<LocalRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    api
      .get(`/api/v1/exams/${selectedId}/marks`)
      .then((r) => {
        const payload = r.data.data as { exam: ExamMeta; rows: MarkRow[] };
        setMeta(payload.exam);
        setRows(
          payload.rows.map((row) => ({
            studentId: row.studentId,
            studentName: row.studentName,
            rollNumber: row.rollNumber,
            marksObtained: toStr(row.entry?.marksObtained ?? null),
            theoryMarks: toStr(row.entry?.theoryMarks ?? null),
            mcqCorrect: toStr(row.entry?.mcqCorrect ?? null),
            mcqIncorrect: toStr(row.entry?.mcqIncorrect ?? null),
            mcqUnattempted: toStr(row.entry?.mcqUnattempted ?? null),
            isAbsent: row.entry?.isAbsent ?? false,
            note: row.entry?.note ?? "",
            dirty: false,
            saving: false,
            error: "",
          })),
        );
      })
      .finally(() => setLoading(false));
  }, [selectedId]);

  const enteredCount = rows.filter((r) => {
    if (r.isAbsent) return true;
    if (meta?.type === "MCQ")
      return r.mcqCorrect !== "" && r.mcqIncorrect !== "" && r.mcqUnattempted !== "";
    if (meta?.type === "THEORY_MCQ")
      return (
        r.theoryMarks !== "" &&
        r.mcqCorrect !== "" &&
        r.mcqIncorrect !== "" &&
        r.mcqUnattempted !== ""
      );
    return r.marksObtained !== "";
  }).length;
  const absentCount = rows.filter((r) => r.isAbsent).length;
  const remaining = rows.length - enteredCount;

  function update(studentId: string, patch: Partial<LocalRow>) {
    setRows((rs) =>
      rs.map((r) => (r.studentId === studentId ? { ...r, ...patch, dirty: true, error: "" } : r)),
    );
  }

  const saveRow = useCallback(
    async (row: LocalRow) => {
      if (!meta) return;
      const body: Record<string, unknown> = { studentId: row.studentId };
      if (row.isAbsent) {
        body.isAbsent = true;
      } else if (meta.type === "MCQ") {
        if (row.mcqCorrect === "" || row.mcqIncorrect === "" || row.mcqUnattempted === "") return;
        body.mcqCorrect = Number(row.mcqCorrect);
        body.mcqIncorrect = Number(row.mcqIncorrect);
        body.mcqUnattempted = Number(row.mcqUnattempted);
      } else if (meta.type === "THEORY_MCQ") {
        if (
          row.theoryMarks === "" ||
          row.mcqCorrect === "" ||
          row.mcqIncorrect === "" ||
          row.mcqUnattempted === ""
        )
          return;
        body.theoryMarks = Number(row.theoryMarks);
        body.mcqCorrect = Number(row.mcqCorrect);
        body.mcqIncorrect = Number(row.mcqIncorrect);
        body.mcqUnattempted = Number(row.mcqUnattempted);
      } else {
        if (row.marksObtained === "") return;
        body.marksObtained = Number(row.marksObtained);
      }
      if (row.note) body.note = row.note;

      setRows((rs) => rs.map((r) => (r.studentId === row.studentId ? { ...r, saving: true } : r)));
      try {
        await api.post(`/api/v1/exams/${meta.id}/marks`, body);
        setRows((rs) =>
          rs.map((r) =>
            r.studentId === row.studentId ? { ...r, dirty: false, saving: false, error: "" } : r,
          ),
        );
      } catch (e) {
        const err = e as { response?: { data?: { title?: string } } };
        const msg = err.response?.data?.title ?? "Save failed";
        setRows((rs) =>
          rs.map((r) => (r.studentId === row.studentId ? { ...r, saving: false, error: msg } : r)),
        );
      }
    },
    [meta],
  );

  async function saveAll() {
    if (!meta) return;
    setSubmitting(true);
    const dirty = rows.filter((r) => r.dirty);
    for (const r of dirty) {
      await saveRow(r);
    }
    await api.post(`/api/v1/exams/${meta.id}/marks/calculate`).catch(() => {});
    setSubmitting(false);
    onSaved();
  }

  async function submitForReview() {
    if (!meta) return;
    setSubmitting(true);
    try {
      await api.post(`/api/v1/exams/${meta.id}/marks/submit-for-review`);
      onSaved();
      setMeta({ ...meta, status: "UNDER_REVIEW" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center flex-wrap">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="text-sm rounded-md border border-border-soft bg-white/92 px-3 py-2 min-w-[240px]"
        >
          <option value="">— Select exam to enter marks —</option>
          {entryExams.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} ({e.batch.name})
            </option>
          ))}
        </select>
        {meta && (
          <Badge tone="neutral">
            {enteredCount} entered · {absentCount} absent · {remaining} remaining
          </Badge>
        )}
      </div>

      {!selectedId && (
        <div className="glass-panel p-8 text-center text-sm text-text-dim">
          Select an exam above to enter marks.
        </div>
      )}

      {loading && <div className="text-xs text-text-dim">Loading...</div>}

      {meta && !loading && (
        <>
          <div className="glass-panel overflow-hidden">
            <div className="overflow-x-auto">
              {meta.type === "MCQ" && (
                <McqTable meta={meta} rows={rows} update={update} saveRow={saveRow} />
              )}
              {meta.type === "THEORY_MCQ" && (
                <TheoryMcqTable meta={meta} rows={rows} update={update} saveRow={saveRow} />
              )}
              {(meta.type === "THEORY" ||
                meta.type === "OBJECTIVE" ||
                meta.type === "NUMERICAL") && (
                <TheoryTable meta={meta} rows={rows} update={update} saveRow={saveRow} />
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Save size={14} />}
              onClick={saveAll}
              disabled={submitting}
            >
              Save all & recalculate
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Send size={14} />}
              onClick={submitForReview}
              loading={submitting}
              disabled={submitting || meta.status !== "MARKS_ENTRY"}
            >
              Submit for review
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function passStatus(m: ExamMeta, marks: number | null): "pass" | "fail" | null {
  if (marks == null) return null;
  if (m.cutOffType === "MARKS" && m.passingMarks != null) {
    return marks >= m.passingMarks ? "pass" : "fail";
  }
  if (m.cutOffType === "PERCENTAGE" && m.passingPercent != null) {
    const pct = (marks / m.totalMarks) * 100;
    return pct >= m.passingPercent ? "pass" : "fail";
  }
  return null;
}

function AbsentBtn({ isAbsent, onClick }: { isAbsent: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={isAbsent ? "Unmark absent" : "Mark absent"}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-2xs font-semibold border ${
        isAbsent
          ? "bg-warning/10 text-warning border-warning/30"
          : "bg-white/70 text-text-muted border-border-soft hover:bg-warning/5"
      }`}
    >
      <UserX size={10} /> {isAbsent ? "Absent" : "Absent?"}
    </button>
  );
}

function TheoryTable({
  meta,
  rows,
  update,
  saveRow,
}: {
  meta: ExamMeta;
  rows: LocalRow[];
  update: (id: string, patch: Partial<LocalRow>) => void;
  saveRow: (row: LocalRow) => Promise<void>;
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border-soft text-left text-text-dim">
          <th className="px-4 py-2.5 w-10">#</th>
          <th className="px-4 py-2.5 font-medium">Student</th>
          <th className="px-4 py-2.5 font-medium">Roll</th>
          <th className="px-4 py-2.5 font-medium">Marks (/{meta.totalMarks})</th>
          <th className="px-4 py-2.5 font-medium">Status</th>
          <th className="px-4 py-2.5 font-medium">Note</th>
          <th className="px-4 py-2.5 w-20" />
        </tr>
      </thead>
      <tbody>
        {rows.map((r, idx) => {
          const ps = passStatus(meta, r.isAbsent ? null : Number(r.marksObtained || 0));
          return (
            <tr
              key={r.studentId}
              className={`border-b border-border-soft last:border-0 ${
                ps === "fail" ? "bg-danger/5" : ""
              }`}
            >
              <td className="px-4 py-2 text-text-dim font-mono text-xs">{idx + 1}</td>
              <td className="px-4 py-2 text-text-primary">{r.studentName}</td>
              <td className="px-4 py-2 text-text-muted font-mono text-xs">{r.rollNumber ?? "—"}</td>
              <td className="px-4 py-2">
                <input
                  type="number"
                  min={0}
                  max={meta.totalMarks}
                  disabled={r.isAbsent}
                  value={r.marksObtained}
                  onChange={(e) => update(r.studentId, { marksObtained: e.target.value })}
                  onBlur={() => r.dirty && saveRow(r)}
                  className="w-24 rounded border border-border-soft bg-white/90 px-2 py-1 text-sm disabled:opacity-50"
                />
              </td>
              <td className="px-4 py-2">
                {r.isAbsent ? (
                  <Badge tone="warning">Absent</Badge>
                ) : ps === "pass" ? (
                  <Badge tone="success">Pass</Badge>
                ) : ps === "fail" ? (
                  <Badge tone="danger">Fail</Badge>
                ) : (
                  <span className="text-text-dim text-xs">—</span>
                )}
              </td>
              <td className="px-4 py-2">
                <input
                  type="text"
                  value={r.note}
                  onChange={(e) => update(r.studentId, { note: e.target.value })}
                  onBlur={() => r.dirty && saveRow(r)}
                  className="w-full rounded border border-border-soft bg-white/90 px-2 py-1 text-xs"
                />
                {r.error && <div className="text-2xs text-danger mt-0.5">{r.error}</div>}
              </td>
              <td className="px-4 py-2">
                <AbsentBtn
                  isAbsent={r.isAbsent}
                  onClick={() => update(r.studentId, { isAbsent: !r.isAbsent })}
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function McqTable({
  meta,
  rows,
  update,
  saveRow,
}: {
  meta: ExamMeta;
  rows: LocalRow[];
  update: (id: string, patch: Partial<LocalRow>) => void;
  saveRow: (row: LocalRow) => Promise<void>;
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border-soft text-left text-text-dim">
          <th className="px-4 py-2.5 w-10">#</th>
          <th className="px-4 py-2.5 font-medium">Student</th>
          <th className="px-4 py-2.5 font-medium">Roll</th>
          <th className="px-4 py-2.5 font-medium">Correct</th>
          <th className="px-4 py-2.5 font-medium">Wrong</th>
          <th className="px-4 py-2.5 font-medium">Skip</th>
          <th className="px-4 py-2.5 font-medium">Score</th>
          <th className="px-4 py-2.5 font-medium">Status</th>
          <th className="px-4 py-2.5 w-20" />
        </tr>
      </thead>
      <tbody>
        {rows.map((r, idx) => {
          const c = Number(r.mcqCorrect || 0);
          const w = Number(r.mcqIncorrect || 0);
          const u = Number(r.mcqUnattempted || 0);
          const mpc = meta.marksPerCorrect ?? 0;
          const mpw = meta.marksPerWrong ?? 0;
          const mpu = meta.marksPerUnattempted ?? 0;
          const liveScore = c * mpc + w * mpw + u * mpu;
          const totalQ = meta.totalQuestions ?? 0;
          const sumOk = r.isAbsent || c + w + u === totalQ;
          const ps = passStatus(meta, r.isAbsent ? null : liveScore);
          return (
            <tr
              key={r.studentId}
              className={`border-b border-border-soft last:border-0 ${
                ps === "fail" ? "bg-danger/5" : ""
              }`}
            >
              <td className="px-4 py-2 text-text-dim font-mono text-xs">{idx + 1}</td>
              <td className="px-4 py-2 text-text-primary">{r.studentName}</td>
              <td className="px-4 py-2 text-text-muted font-mono text-xs">{r.rollNumber ?? "—"}</td>
              {[
                { key: "mcqCorrect" as const, value: r.mcqCorrect },
                { key: "mcqIncorrect" as const, value: r.mcqIncorrect },
                { key: "mcqUnattempted" as const, value: r.mcqUnattempted },
              ].map((col) => (
                <td key={col.key} className="px-4 py-2">
                  <input
                    type="number"
                    min={0}
                    max={totalQ}
                    disabled={r.isAbsent}
                    value={col.value}
                    onChange={(e) => update(r.studentId, { [col.key]: e.target.value })}
                    onBlur={() => r.dirty && sumOk && saveRow(r)}
                    className="w-16 rounded border border-border-soft bg-white/90 px-2 py-1 text-sm disabled:opacity-50"
                  />
                </td>
              ))}
              <td className="px-4 py-2 font-semibold text-text-primary">
                {r.isAbsent ? (
                  "—"
                ) : (
                  <span>
                    {liveScore.toFixed(0)}/{meta.totalMarks}
                    {!sumOk && (
                      <span className="block text-2xs text-danger font-normal">
                        Counts must sum to {totalQ}
                      </span>
                    )}
                  </span>
                )}
              </td>
              <td className="px-4 py-2">
                {r.isAbsent ? (
                  <Badge tone="warning">Absent</Badge>
                ) : ps === "pass" ? (
                  <Badge tone="success">Pass</Badge>
                ) : ps === "fail" ? (
                  <Badge tone="danger">Fail</Badge>
                ) : (
                  <span className="text-text-dim text-xs">—</span>
                )}
              </td>
              <td className="px-4 py-2">
                <AbsentBtn
                  isAbsent={r.isAbsent}
                  onClick={() => update(r.studentId, { isAbsent: !r.isAbsent })}
                />
                {r.error && <div className="text-2xs text-danger mt-0.5">{r.error}</div>}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function TheoryMcqTable({
  meta,
  rows,
  update,
  saveRow,
}: {
  meta: ExamMeta;
  rows: LocalRow[];
  update: (id: string, patch: Partial<LocalRow>) => void;
  saveRow: (row: LocalRow) => Promise<void>;
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border-soft text-left text-text-dim">
          <th className="px-4 py-2.5 w-10">#</th>
          <th className="px-4 py-2.5 font-medium">Student</th>
          <th className="px-4 py-2.5 font-medium">Theory /{meta.theoryMaxMarks ?? 0}</th>
          <th className="px-4 py-2.5 font-medium">Correct</th>
          <th className="px-4 py-2.5 font-medium">Wrong</th>
          <th className="px-4 py-2.5 font-medium">Skip</th>
          <th className="px-4 py-2.5 font-medium">MCQ /{meta.mcqMaxMarks ?? 0}</th>
          <th className="px-4 py-2.5 font-medium">Total /{meta.totalMarks}</th>
          <th className="px-4 py-2.5 w-20" />
        </tr>
      </thead>
      <tbody>
        {rows.map((r, idx) => {
          const theory = Number(r.theoryMarks || 0);
          const c = Number(r.mcqCorrect || 0);
          const w = Number(r.mcqIncorrect || 0);
          const u = Number(r.mcqUnattempted || 0);
          const mcqScore =
            c * (meta.marksPerCorrect ?? 0) +
            w * (meta.marksPerWrong ?? 0) +
            u * (meta.marksPerUnattempted ?? 0);
          const total = theory + mcqScore;
          const totalQ = meta.mcqQuestionCount ?? meta.totalQuestions ?? 0;
          const sumOk = r.isAbsent || c + w + u === totalQ;
          const ps = passStatus(meta, r.isAbsent ? null : total);
          return (
            <tr
              key={r.studentId}
              className={`border-b border-border-soft last:border-0 ${
                ps === "fail" ? "bg-danger/5" : ""
              }`}
            >
              <td className="px-4 py-2 text-text-dim font-mono text-xs">{idx + 1}</td>
              <td className="px-4 py-2 text-text-primary">{r.studentName}</td>
              <td className="px-4 py-2">
                <input
                  type="number"
                  min={0}
                  max={meta.theoryMaxMarks ?? undefined}
                  disabled={r.isAbsent}
                  value={r.theoryMarks}
                  onChange={(e) => update(r.studentId, { theoryMarks: e.target.value })}
                  onBlur={() => r.dirty && sumOk && saveRow(r)}
                  className="w-20 rounded border border-border-soft bg-white/90 px-2 py-1 text-sm"
                />
              </td>
              {[
                { key: "mcqCorrect" as const, value: r.mcqCorrect },
                { key: "mcqIncorrect" as const, value: r.mcqIncorrect },
                { key: "mcqUnattempted" as const, value: r.mcqUnattempted },
              ].map((col) => (
                <td key={col.key} className="px-4 py-2">
                  <input
                    type="number"
                    min={0}
                    max={totalQ}
                    disabled={r.isAbsent}
                    value={col.value}
                    onChange={(e) => update(r.studentId, { [col.key]: e.target.value })}
                    onBlur={() => r.dirty && sumOk && saveRow(r)}
                    className="w-16 rounded border border-border-soft bg-white/90 px-2 py-1 text-sm"
                  />
                </td>
              ))}
              <td className="px-4 py-2 text-text-muted">
                {r.isAbsent ? "—" : mcqScore.toFixed(0)}
              </td>
              <td className="px-4 py-2 font-semibold text-text-primary">
                {r.isAbsent ? "—" : total.toFixed(0)}
              </td>
              <td className="px-4 py-2">
                <AbsentBtn
                  isAbsent={r.isAbsent}
                  onClick={() => update(r.studentId, { isAbsent: !r.isAbsent })}
                />
                {r.error && <div className="text-2xs text-danger mt-0.5">{r.error}</div>}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
