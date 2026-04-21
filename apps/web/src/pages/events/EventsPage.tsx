import { Badge, Button, CustomSelect, Input } from "@/components/primitives";
import { api } from "@/lib/api";
import { CalendarDays, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  date: string;
  endDate: string | null;
  type: string;
  audience: string;
}

const TYPE_TONE: Record<string, "success" | "info" | "warning" | "danger" | "neutral"> = {
  ACADEMIC: "info",
  EXTRACURRICULAR: "success",
  HOLIDAY: "warning",
  EXAM: "danger",
};

export function EventsPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState("");

  const load = () => {
    setLoading(true);
    api
      .get("/api/v1/events")
      .then((r) => setEvents(r.data.data))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this event?")) return;
    try {
      await api.delete(`/api/v1/events/${id}`);
      setToast("Event deleted");
      load();
    } catch {
      setToast("Failed to delete event");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3">
            <CalendarDays size={22} className="text-indigo" />
            <h1 className="font-display text-2xl tracking-tight">Events</h1>
          </div>
          <p className="text-text-muted text-sm mt-1">
            {events.length} upcoming and past events
          </p>
        </div>
        <Button onClick={() => setShowModal(true)} leftIcon={<Plus size={16} />}>
          Create Event
        </Button>
      </div>

      {toast && (
        <div className="mb-3 rounded-lg bg-success/10 border border-success/20 px-4 py-2 text-xs text-success">
          {toast}
        </div>
      )}

      {loading ? (
        <div className="text-text-dim text-sm">Loading...</div>
      ) : events.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <CalendarDays size={32} className="text-text-dim mx-auto mb-3" />
          <h3 className="font-display text-lg mb-1">No events yet</h3>
          <p className="text-sm text-text-muted mb-5">
            Create your first event to start planning
          </p>
          <Button onClick={() => setShowModal(true)} leftIcon={<Plus size={14} />} size="sm">
            Create Event
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((e) => {
            const date = new Date(e.date);
            return (
              <div key={e.id} className="glass-panel p-5">
                <div className="flex items-start justify-between mb-3 gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-text-primary truncate">{e.title}</h3>
                    <p className="text-2xs text-text-dim mt-0.5 font-mono">
                      {date.toLocaleDateString()} · {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(e.id)}
                    className="shrink-0 p-1.5 rounded text-text-dim hover:text-[#DC2626] hover:bg-[#FEF2F2]"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                {e.description && (
                  <p className="text-xs text-text-muted mb-3 line-clamp-2">{e.description}</p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge tone={TYPE_TONE[e.type] ?? "neutral"}>{e.type}</Badge>
                  <span className="text-2xs text-text-dim">Audience: {e.audience}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <CreateEventModal
          onClose={() => setShowModal(false)}
          onCreated={() => {
            setShowModal(false);
            setToast("Event created");
            load();
          }}
        />
      )}
    </div>
  );
}

function CreateEventModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [type, setType] = useState("ACADEMIC");
  const [audience, setAudience] = useState("ALL");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!title.trim() || !date) {
      setError("Title and date are required");
      return;
    }
    setSaving(true);
    try {
      const dt = new Date(`${date}T${time}:00`);
      await api.post("/api/v1/events", {
        title,
        description: description || undefined,
        date: dt.toISOString(),
        type,
        audience,
      });
      onCreated();
    } catch (err) {
      const msg =
        (err as { response?: { data?: { title?: string } } }).response?.data?.title ??
        "Failed to create event";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="glass-panel w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto"
        style={{ animation: "scaleIn 0.15s ease-out" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg">Create Event</h2>
          <button onClick={onClose} className="p-1 text-text-dim hover:text-text-body">
            <X size={18} />
          </button>
        </div>
        {error && (
          <div className="mb-4 rounded-lg bg-danger/8 border border-danger/20 px-4 py-2.5 text-xs text-danger">
            {error}
          </div>
        )}
        <form onSubmit={save} className="space-y-3">
          <Input
            label="Title"
            placeholder="Annual Sports Day"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-primary">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={1000}
              className="w-full rounded-md border border-border-soft bg-white/92 px-3.5 py-2.5 text-sm text-text-primary outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/15"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-primary">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full rounded-md border border-border-soft bg-white/92 px-3.5 py-2.5 text-sm text-text-primary outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/15"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-primary">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-md border border-border-soft bg-white/92 px-3.5 py-2.5 text-sm text-text-primary outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/15"
              />
            </div>
          </div>
          <CustomSelect
            label="Type"
            value={type}
            onChange={setType}
            options={[
              { value: "ACADEMIC", label: "Academic" },
              { value: "EXTRACURRICULAR", label: "Extracurricular" },
              { value: "HOLIDAY", label: "Holiday" },
              { value: "EXAM", label: "Exam" },
            ]}
          />
          <CustomSelect
            label="Audience"
            value={audience}
            onChange={setAudience}
            options={[
              { value: "ALL", label: "All" },
              { value: "STUDENTS", label: "Students only" },
              { value: "PARENTS", label: "Parents only" },
              { value: "TEACHERS", label: "Teachers only" },
            ]}
          />
          <div className="pt-2">
            <Button type="submit" fullWidth loading={saving}>
              Create Event
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
