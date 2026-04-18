import { Button } from "@/components/primitives";
import { api } from "@/lib/api";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

interface CreateAssignmentModalProps {
  onClose: () => void;
  onCreated: () => void;
}

interface Batch {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
}

function toLocalDatetimeDefault(hoursAhead: number): string {
  const d = new Date();
  d.setHours(d.getHours() + hoursAhead);
  // yyyy-MM-ddTHH:mm
  const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60 * 1000)
    .toISOString()
    .slice(0, 16);
  return iso;
}

export function CreateAssignmentModal({ onClose, onCreated }: CreateAssignmentModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [batchIds, setBatchIds] = useState<string[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [deadline, setDeadline] = useState(toLocalDatetimeDefault(168));
  const [allowLate, setAllowLate] = useState(true);
  const [lateDeadline, setLateDeadline] = useState("");
  const [totalMarks, setTotalMarks] = useState("100");
  const [latePenalty, setLatePenalty] = useState("10");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!title.trim() || batchIds.length === 0) {
      setError("Title and at least one batch required");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/api/v1/assignments", {
        title,
        description,
        instructions: instructions || undefined,
        batchIds,
        subjectId: subjectId || undefined,
        deadline: new Date(deadline).toISOString(),
        allowLateSubmission: allowLate,
        lateDeadline: allowLate && lateDeadline ? new Date(lateDeadline).toISOString() : undefined,
        totalMarks: Number(totalMarks),
        latePenaltyPercent: allowLate && latePenalty ? Number(latePenalty) : undefined,
      });
      onCreated();
    } catch (err) {
      const e = err as { response?: { data?: { error?: { title?: string } } } };
      setError(e.response?.data?.error?.title ?? "Failed to create");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <form
        onSubmit={submit}
        className="bg-surface rounded-xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-5 border-b border-border-soft">
          <h2 className="font-display text-lg">Create Assignment</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded hover:bg-surface-hover text-text-dim"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              className="w-full px-3 py-2 rounded-md border border-border-soft bg-white/92 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-md border border-border-soft bg-white/92 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Instructions</label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-md border border-border-soft bg-white/92 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Batches * ({batchIds.length} selected)
              </label>
              <div className="max-h-28 overflow-y-auto border border-border-soft rounded-md bg-white/70 p-2 space-y-1">
                {batches.length === 0 ? (
                  <p className="text-xs text-text-muted px-1">No batches yet</p>
                ) : (
                  batches.map((b) => (
                    <label key={b.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={batchIds.includes(b.id)}
                        onChange={(e) => {
                          if (e.target.checked) setBatchIds([...batchIds, b.id]);
                          else setBatchIds(batchIds.filter((id) => id !== b.id));
                        }}
                      />
                      {b.name}
                    </label>
                  ))
                )}
              </div>
              {batches.length > 0 && (
                <div className="flex gap-2 mt-1 text-xs">
                  <button
                    type="button"
                    className="text-indigo hover:underline"
                    onClick={() => setBatchIds(batches.map((b) => b.id))}
                  >
                    Select all
                  </button>
                  {batchIds.length > 0 && (
                    <button
                      type="button"
                      className="text-text-muted hover:underline"
                      onClick={() => setBatchIds([])}
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Subject</label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border-soft bg-white/92 text-sm"
              >
                <option value="">—</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Deadline *</label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border-soft bg-white/92 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Total marks</label>
              <input
                type="number"
                min="1"
                value={totalMarks}
                onChange={(e) => setTotalMarks(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border-soft bg-white/92 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allowLate}
                onChange={(e) => setAllowLate(e.target.checked)}
              />
              Allow late submissions
            </label>
          </div>

          {allowLate && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">
                  Late cutoff (optional)
                </label>
                <input
                  type="datetime-local"
                  value={lateDeadline}
                  onChange={(e) => setLateDeadline(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-border-soft bg-white/92 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">
                  Late penalty %
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={latePenalty}
                  onChange={(e) => setLatePenalty(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-border-soft bg-white/92 text-sm"
                />
              </div>
            </div>
          )}

          {error && <div className="text-xs text-danger">{error}</div>}
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-border-soft">
          <Button variant="ghost" size="sm" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={submitting}>
            {submitting ? "Creating..." : "Create (Draft)"}
          </Button>
        </div>
      </form>
    </div>
  );
}
