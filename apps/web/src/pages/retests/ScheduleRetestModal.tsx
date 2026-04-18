import { Button, Input, SmartDateInput } from "@/components/primitives";
import { api } from "@/lib/api";
import { X } from "lucide-react";
import { useState } from "react";
import type { RetestRow } from "./RetestsPage";

function defaultDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

export function ScheduleRetestModal({
  retest,
  onClose,
  onDone,
}: {
  retest: RetestRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const [date, setDate] = useState(retest.scheduledDate?.slice(0, 10) ?? defaultDate());
  const [time, setTime] = useState(retest.scheduledTime ?? "14:30");
  const [note, setNote] = useState(retest.note ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    setSubmitting(true);
    try {
      await api.patch(`/api/v1/retests/${retest.id}/schedule`, {
        scheduledDate: date,
        scheduledTime: time,
        note: note || undefined,
      });
      onDone();
    } catch (e) {
      const err = e as { response?: { data?: { title?: string } } };
      setError(err.response?.data?.title ?? "Failed to schedule");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto p-4">
      <div className="glass-panel w-full max-w-md mt-16 relative">
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-3 right-3 text-text-muted hover:text-text-primary"
        >
          <X size={18} />
        </button>
        <div className="p-5 border-b border-border-soft">
          <h2 className="font-display text-lg">Schedule retest</h2>
          <p className="text-xs text-text-muted mt-1">
            {retest.student.user.name} · {retest.exam.name}
          </p>
        </div>
        <div className="p-5 space-y-3">
          <SmartDateInput label="Date" value={date} onChange={setDate} />
          <Input label="Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          <div>
            <label
              htmlFor="retest-note"
              className="mb-1.5 block text-xs font-medium text-text-muted"
            >
              Note (optional)
            </label>
            <textarea
              id="retest-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-border-soft bg-white/92 px-3.5 py-2.5 text-sm text-text-primary outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/15"
            />
          </div>
          <div className="text-2xs text-text-dim px-3 py-2 rounded bg-indigo/5 border border-indigo/10">
            Student will be notified via WhatsApp + SMS. Parents receive a separate message.
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
            disabled={submitting}
          >
            Confirm Schedule
          </Button>
        </div>
      </div>
    </div>
  );
}
