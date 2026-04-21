import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, Bell, Check, Inbox, MessageSquare, Plus, Send, Settings } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge, Button } from "@/components/primitives";
import { TemplateEditor } from "@/components/communications/TemplateEditor";
import { useSocket } from "@/hooks/useSocket";
import { api } from "@/lib/api";

type Tab = "compose" | "templates" | "history" | "analytics" | "settings";
type Channel = "WHATSAPP" | "SMS" | "EMAIL" | "IN_APP";
type AudienceType = "ALL_STUDENTS" | "ALL_PARENTS" | "ALL_MEMBERS" | "BATCH" | "CLASS" | "CUSTOM";

interface Template {
  id: string;
  name: string;
  slug: string;
  eventType: string;
  channel: Channel;
  subject: string | null;
  body: string;
  isDefault: boolean;
  isActive: boolean;
}

interface Campaign {
  id: string;
  title: string;
  message: string;
  channels: Channel[];
  audienceType: AudienceType;
  recipientCount: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  status: string;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
  createdBy: { id: string; name: string } | null;
}

interface DeliveryRow {
  id: string;
  campaignId: string | null;
  channel: Channel;
  eventType: string | null;
  status: string;
  message: string;
  recipientPhone: string | null;
  recipientEmail: string | null;
  createdAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
  recipient: { id: string; name: string; role: string } | null;
}

interface DeliveryStats {
  totals: { sent: number; delivered: number; read: number; failed: number; deliveryRate: number };
  byChannel: Array<{ channel: Channel; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
  byEvent: Array<{ eventType: string; count: number }>;
  daily: Array<{ day: string; count: number }>;
  whatsappTotal: number;
}

const EVENT_TYPES = [
  { key: "attendance_absent", label: "Student Absent" },
  { key: "fee_paid", label: "Fee Paid" },
  { key: "fee_reminder", label: "Fee Reminder" },
  { key: "fee_overdue", label: "Fee Overdue" },
  { key: "marks_published", label: "Marks Published" },
  { key: "enrollment_approved", label: "Enrollment Approved" },
  { key: "enrollment_approved_parent", label: "Enrollment (Parent)" },
  { key: "teacher_welcome", label: "Teacher Welcome" },
];

export function CommunicationsPage() {
  const [tab, setTab] = useState<Tab>("compose");
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl tracking-tight">Communications</h1>
          <p className="text-text-muted text-sm mt-1">
            Broadcasts, templates, delivery history, and notification settings
          </p>
        </div>
      </div>

      <div className="border-b border-border-soft mb-6 flex gap-1 overflow-x-auto">
        <TabBtn active={tab === "compose"} onClick={() => setTab("compose")} icon={<Send size={14} />}>
          Compose
        </TabBtn>
        <TabBtn
          active={tab === "templates"}
          onClick={() => setTab("templates")}
          icon={<MessageSquare size={14} />}
        >
          Templates
        </TabBtn>
        <TabBtn active={tab === "history"} onClick={() => setTab("history")} icon={<Inbox size={14} />}>
          History
        </TabBtn>
        <TabBtn
          active={tab === "analytics"}
          onClick={() => setTab("analytics")}
          icon={<BarChart3 size={14} />}
        >
          Analytics
        </TabBtn>
        <TabBtn
          active={tab === "settings"}
          onClick={() => setTab("settings")}
          icon={<Settings size={14} />}
        >
          Settings
        </TabBtn>
      </div>

      {toast && (
        <div className="mb-3 rounded-lg bg-success/10 border border-success/20 px-4 py-2 text-xs text-success">
          {toast}
        </div>
      )}

      {tab === "compose" && <ComposeTab onToast={setToast} />}
      {tab === "templates" && <TemplatesTab onToast={setToast} />}
      {tab === "history" && <HistoryTab />}
      {tab === "analytics" && <AnalyticsTab />}
      {tab === "settings" && <SettingsTab onToast={setToast} />}
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
      className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap inline-flex items-center gap-2 ${
        active
          ? "border-indigo text-text-primary"
          : "border-transparent text-text-muted hover:text-text-primary"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

// ── Compose ──────────────────────────────────────────────

function ComposeTab({ onToast }: { onToast: (s: string) => void }) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [channels, setChannels] = useState<Set<Channel>>(new Set(["WHATSAPP", "SMS"]));
  const [audienceTypes, setAudienceTypes] = useState<Set<AudienceType>>(new Set(["ALL_PARENTS"]));
  const [batches, setBatches] = useState<Array<{ id: string; name: string }>>([]);
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [students, setStudents] = useState<
    Array<{ id: string; user: { name: string }; batch: { name: string } | null }>
  >([]);
  const [selectedBatches, setSelectedBatches] = useState<Set<string>>(new Set());
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set());
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleAudienceType(t: AudienceType) {
    setAudienceTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  useEffect(() => {
    api.get("/api/v1/batches").then((r) => setBatches(r.data.data));
    api.get("/api/v1/classes").then((r) => setClasses(r.data.data));
    api.get("/api/v1/students?pageSize=200").then((r) => setStudents(r.data.data));
  }, []);

  useEffect(() => {
    let count = 0;
    if (audienceTypes.has("ALL_STUDENTS")) count = Math.max(count, students.length);
    if (audienceTypes.has("ALL_PARENTS") || audienceTypes.has("ALL_MEMBERS"))
      count = Math.max(count, students.length);
    if (audienceTypes.has("BATCH") && selectedBatches.size > 0) count += selectedBatches.size * 20;
    if (audienceTypes.has("CLASS") && selectedClasses.size > 0) count += selectedClasses.size;
    if (audienceTypes.has("CUSTOM") && selectedStudents.size > 0) count += selectedStudents.size;
    setRecipientCount(count);
  }, [audienceTypes, batches, classes, students, selectedBatches, selectedClasses, selectedStudents]);

  function toggleChannel(c: Channel) {
    setChannels((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }

  function toggleSet(set: Set<string>, id: string, setter: (s: Set<string>) => void) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  }

  function buildPayload() {
    const types = Array.from(audienceTypes);
    const primary = types[0] ?? "ALL_MEMBERS";
    const payload: Record<string, unknown> = {
      title,
      message,
      channels: Array.from(channels),
      audienceType: primary,
      audienceTypes: types,
    };
    const filter: Record<string, string[]> = {};
    if (audienceTypes.has("BATCH")) filter.batchIds = Array.from(selectedBatches);
    if (audienceTypes.has("CLASS")) filter.classIds = Array.from(selectedClasses);
    if (audienceTypes.has("CUSTOM")) filter.studentIds = Array.from(selectedStudents);
    if (Object.keys(filter).length > 0) payload.audienceFilter = filter;

    if (scheduleEnabled && scheduledAt) {
      payload.scheduledAt = new Date(scheduledAt).toISOString();
    } else {
      payload.scheduledAt = null;
    }
    return payload;
  }

  async function submit() {
    if (!title.trim() || !message.trim() || channels.size === 0) return;
    setLoading(true);
    try {
      await api.post("/api/v1/broadcasts", buildPayload());
      setConfirmOpen(false);
      onToast("Broadcast queued");
      setTitle("");
      setMessage("");
      setAudienceTypes(new Set(["ALL_PARENTS"]));
      setSelectedBatches(new Set());
      setSelectedClasses(new Set());
      setSelectedStudents(new Set());
      setScheduleEnabled(false);
      setScheduledAt("");
    } catch (err) {
      const msg =
        (err as { response?: { data?: { title?: string } } }).response?.data?.title ??
        "Send failed";
      onToast(msg);
    } finally {
      setLoading(false);
    }
  }

  const canSend =
    title.trim().length > 0 &&
    message.trim().length > 0 &&
    channels.size > 0 &&
    audienceTypes.size > 0 &&
    (!audienceTypes.has("BATCH") || selectedBatches.size > 0) &&
    (!audienceTypes.has("CLASS") || selectedClasses.size > 0) &&
    (!audienceTypes.has("CUSTOM") || selectedStudents.size > 0);

  const activeChannel: Channel = channels.has("SMS") ? "SMS" : channels.has("WHATSAPP") ? "WHATSAPP" : "EMAIL";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 glass-panel p-5 space-y-4">
        <div>
          <label className="block text-2xs uppercase tracking-wider text-text-dim mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Holiday Notice"
            className="w-full rounded-md border border-border-soft bg-white/92 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-2xs uppercase tracking-wider text-text-dim mb-1">Message</label>
          <TemplateEditor value={message} onChange={setMessage} channel={activeChannel} rows={6} />
        </div>

        <div>
          <label className="block text-2xs uppercase tracking-wider text-text-dim mb-1">Channels</label>
          <div className="flex gap-2 flex-wrap">
            {(["WHATSAPP", "SMS", "EMAIL"] as Channel[]).map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => toggleChannel(c)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-semibold transition-colors ${
                  channels.has(c)
                    ? "border-indigo bg-indigo/10 text-indigo"
                    : "border-border-soft bg-white/60 text-text-muted hover:bg-white"
                }`}
              >
                {channels.has(c) && <Check size={12} />}
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-2xs uppercase tracking-wider text-text-dim mb-1">
            Audience <span className="normal-case text-text-dim">· select one or more</span>
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {(
              [
                ["ALL_STUDENTS", "All Students"],
                ["ALL_PARENTS", "All Parents"],
                ["ALL_MEMBERS", "All Members"],
                ["BATCH", "Specific Batch(es)"],
                ["CLASS", "Specific Class(es)"],
                ["CUSTOM", "Custom List"],
              ] as const
            ).map(([val, label]) => {
              const selected = audienceTypes.has(val);
              return (
                <button
                  type="button"
                  key={val}
                  onClick={() => toggleAudienceType(val)}
                  className={`px-3 py-2 rounded-md border text-xs text-left transition-colors ${
                    selected
                      ? "border-indigo bg-indigo text-white font-semibold"
                      : "border-border-soft bg-white/60 text-text-primary hover:bg-white"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {audienceTypes.has("BATCH") && (
            <div className="mt-3 max-h-40 overflow-y-auto border border-border-soft rounded-md divide-y divide-border-soft">
              {batches.map((b) => (
                <label
                  key={b.id}
                  className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-white/40"
                >
                  <input
                    type="checkbox"
                    checked={selectedBatches.has(b.id)}
                    onChange={() => toggleSet(selectedBatches, b.id, setSelectedBatches)}
                    className="w-4 h-4 rounded cursor-pointer"
                  />
                  <span className="text-sm">{b.name}</span>
                </label>
              ))}
            </div>
          )}

          {audienceTypes.has("CLASS") && (
            <div className="mt-3 max-h-40 overflow-y-auto border border-border-soft rounded-md divide-y divide-border-soft">
              {classes.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-white/40"
                >
                  <input
                    type="checkbox"
                    checked={selectedClasses.has(c.id)}
                    onChange={() => toggleSet(selectedClasses, c.id, setSelectedClasses)}
                    className="w-4 h-4 rounded cursor-pointer"
                  />
                  <span className="text-sm">{c.name}</span>
                </label>
              ))}
            </div>
          )}

          {audienceTypes.has("CUSTOM") && (
            <div className="mt-3 max-h-40 overflow-y-auto border border-border-soft rounded-md divide-y divide-border-soft">
              {students.map((s) => (
                <label
                  key={s.id}
                  className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-white/40"
                >
                  <input
                    type="checkbox"
                    checked={selectedStudents.has(s.id)}
                    onChange={() => toggleSet(selectedStudents, s.id, setSelectedStudents)}
                    className="w-4 h-4 rounded cursor-pointer"
                  />
                  <span className="text-sm flex-1">{s.user.name}</span>
                  <span className="text-2xs text-text-dim">{s.batch?.name ?? "—"}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={scheduleEnabled}
              onChange={() => setScheduleEnabled((p) => !p)}
              className="w-4 h-4 rounded cursor-pointer"
            />
            Schedule for later
          </label>
          {scheduleEnabled && (
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="mt-2 rounded-md border border-border-soft bg-white/92 px-3 py-2 text-sm"
            />
          )}
        </div>
      </div>

      <div className="glass-panel p-5 h-fit">
        <div className="text-2xs uppercase tracking-wider text-text-dim mb-3">Summary</div>
        <div className="space-y-3 text-sm">
          <Row label="Channels" value={Array.from(channels).join(", ") || "—"} />
          <Row
            label="Audience"
            value={
              audienceTypes.size === 0
                ? "—"
                : Array.from(audienceTypes)
                    .map((t) => t.replace(/_/g, " ").toLowerCase())
                    .join(", ")
            }
          />
          <Row
            label="Recipients"
            value={recipientCount !== null ? `~${recipientCount}` : "—"}
          />
          <Row
            label="Send time"
            value={scheduleEnabled && scheduledAt ? new Date(scheduledAt).toLocaleString() : "Now"}
          />
        </div>
        <div className="mt-5 flex flex-col gap-2">
          <Button
            leftIcon={<Send size={14} />}
            fullWidth
            disabled={!canSend}
            onClick={() => setConfirmOpen(true)}
          >
            {scheduleEnabled ? "Schedule" : "Send Broadcast"}
          </Button>
        </div>
      </div>

      {confirmOpen && (
        <ConfirmModal
          title={scheduleEnabled ? "Schedule broadcast?" : "Send broadcast?"}
          body={`This will ${
            scheduleEnabled ? "schedule" : "send"
          } to approximately ${recipientCount ?? 0} recipient(s) across ${
            channels.size
          } channel(s).`}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={submit}
          loading={loading}
        />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-2xs uppercase tracking-wider text-text-dim">{label}</span>
      <span className="text-text-primary capitalize">{value}</span>
    </div>
  );
}

function ConfirmModal({
  title,
  body,
  onCancel,
  onConfirm,
  loading,
}: {
  title: string;
  body: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm p-4">
      <div className="glass-panel p-6 w-full max-w-md">
        <div className="font-display text-lg mb-2">{title}</div>
        <p className="text-sm text-text-muted mb-5">{body}</p>
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" loading={loading} onClick={onConfirm}>
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Templates ────────────────────────────────────────────

function TemplatesTab({ onToast }: { onToast: (s: string) => void }) {
  const [rows, setRows] = useState<Template[]>([]);
  const [editing, setEditing] = useState<Template | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    api.get("/api/v1/templates").then((r) => setRows(r.data.data));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function deleteTemplate(id: string) {
    try {
      await api.delete(`/api/v1/templates/${id}`);
      onToast("Template deleted");
      load();
    } catch (err) {
      const msg =
        (err as { response?: { data?: { title?: string } } }).response?.data?.title ?? "Delete failed";
      onToast(msg);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-text-muted">{rows.length} templates</div>
        <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setCreating(true)}>
          Create Template
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rows.map((t) => (
          <button
            type="button"
            key={t.id}
            onClick={() => setEditing(t)}
            className="glass-panel p-4 text-left hover:-translate-y-0.5 transition-transform"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="font-semibold text-sm">{t.name}</div>
                <div className="text-2xs text-text-dim font-mono">{t.eventType}</div>
              </div>
              <div className="flex gap-1.5">
                <Badge tone={t.channel === "WHATSAPP" ? "success" : t.channel === "SMS" ? "info" : "neutral"}>
                  {t.channel}
                </Badge>
                {t.isDefault && <Badge tone="accent">default</Badge>}
              </div>
            </div>
            <p className="text-xs text-text-muted line-clamp-3 whitespace-pre-wrap">{t.body}</p>
          </button>
        ))}
      </div>
      {rows.length === 0 && (
        <div className="glass-panel p-10 text-center text-text-muted">No templates yet.</div>
      )}

      {editing && (
        <TemplateEditModal
          template={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onToast("Template saved");
            load();
          }}
          onDelete={async () => {
            await deleteTemplate(editing.id);
            setEditing(null);
          }}
        />
      )}
      {creating && (
        <TemplateCreateModal
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            onToast("Template created");
            load();
          }}
        />
      )}
    </div>
  );
}

function TemplateEditModal({
  template,
  onClose,
  onSaved,
  onDelete,
}: {
  template: Template;
  onClose: () => void;
  onSaved: () => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(template.name);
  const [body, setBody] = useState(template.body);
  const [subject, setSubject] = useState(template.subject ?? "");
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    try {
      await api.patch(`/api/v1/templates/${template.id}`, {
        name,
        body,
        subject: template.channel === "EMAIL" ? subject : null,
      });
      onSaved();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm p-4">
      <div className="glass-panel p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="font-display text-xl">{template.name}</div>
            <div className="text-2xs text-text-dim font-mono mt-1">
              {template.eventType} · {template.channel}
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-text-primary">
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-2xs uppercase tracking-wider text-text-dim mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-border-soft bg-white/92 px-3 py-2 text-sm"
            />
          </div>
          {template.channel === "EMAIL" && (
            <div>
              <label className="block text-2xs uppercase tracking-wider text-text-dim mb-1">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-md border border-border-soft bg-white/92 px-3 py-2 text-sm"
              />
            </div>
          )}
          <div>
            <label className="block text-2xs uppercase tracking-wider text-text-dim mb-1">Body</label>
            <TemplateEditor value={body} onChange={setBody} channel={template.channel} rows={6} />
          </div>
        </div>

        <div className="flex gap-2 justify-between mt-5">
          <div>
            {!template.isDefault && (
              <Button size="sm" variant="ghost" onClick={onDelete}>
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" loading={loading} onClick={save}>
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TemplateCreateModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [eventType, setEventType] = useState("custom_event");
  const [channel, setChannel] = useState<Channel>("WHATSAPP");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    setErr("");
    if (!name.trim() || !slug.trim() || !body.trim()) return;
    setLoading(true);
    try {
      await api.post("/api/v1/templates", {
        name,
        slug,
        eventType,
        channel,
        subject: channel === "EMAIL" ? subject : undefined,
        body,
      });
      onSaved();
    } catch (e) {
      const m =
        (e as { response?: { data?: { title?: string } } }).response?.data?.title ?? "Save failed";
      setErr(m);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm p-4">
      <div className="glass-panel p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div className="font-display text-xl">New Template</div>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-text-primary">
            ×
          </button>
        </div>
        {err && (
          <div className="mb-3 rounded-lg bg-danger/10 border border-danger/20 px-3 py-2 text-xs text-danger">
            {err}
          </div>
        )}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-2xs uppercase tracking-wider text-text-dim mb-1">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-border-soft bg-white/92 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-2xs uppercase tracking-wider text-text-dim mb-1">
                Slug
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
                placeholder="custom_notification"
                className="w-full rounded-md border border-border-soft bg-white/92 px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-2xs uppercase tracking-wider text-text-dim mb-1">
                Event type
              </label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full rounded-md border border-border-soft bg-white/92 px-3 py-2 text-sm"
              >
                {EVENT_TYPES.map((ev) => (
                  <option key={ev.key} value={ev.key}>
                    {ev.label}
                  </option>
                ))}
                <option value="custom_event">Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-2xs uppercase tracking-wider text-text-dim mb-1">
                Channel
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as Channel)}
                className="w-full rounded-md border border-border-soft bg-white/92 px-3 py-2 text-sm"
              >
                <option value="WHATSAPP">WhatsApp</option>
                <option value="SMS">SMS</option>
                <option value="EMAIL">Email</option>
                <option value="IN_APP">In-App</option>
              </select>
            </div>
          </div>
          {channel === "EMAIL" && (
            <div>
              <label className="block text-2xs uppercase tracking-wider text-text-dim mb-1">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-md border border-border-soft bg-white/92 px-3 py-2 text-sm"
              />
            </div>
          )}
          <div>
            <label className="block text-2xs uppercase tracking-wider text-text-dim mb-1">Body</label>
            <TemplateEditor value={body} onChange={setBody} channel={channel} rows={6} />
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <Button size="sm" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" loading={loading} onClick={save}>
            Create
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── History ──────────────────────────────────────────────

function HistoryTab() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [active, setActive] = useState<Campaign | null>(null);
  const [activeDeliveries, setActiveDeliveries] = useState<DeliveryRow[]>([]);

  const load = useCallback(() => {
    api.get("/api/v1/broadcasts?pageSize=50").then((r) => setCampaigns(r.data.data));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useSocket("broadcast:sent", load);
  useSocket("broadcast:progress", load);
  useSocket("broadcast:created", load);

  useEffect(() => {
    if (!active) return;
    api.get(`/api/v1/broadcasts/${active.id}/deliveries`).then((r) => setActiveDeliveries(r.data.data));
  }, [active]);

  return (
    <div>
      {campaigns.length === 0 && (
        <div className="glass-panel p-10 text-center text-text-muted">No campaigns yet.</div>
      )}
      <div className="glass-panel overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-soft text-left text-text-dim">
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Channels</th>
              <th className="px-4 py-3 font-medium">Audience</th>
              <th className="px-4 py-3 font-medium">Sent</th>
              <th className="px-4 py-3 font-medium">Delivered</th>
              <th className="px-4 py-3 font-medium">Failed</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr
                key={c.id}
                className="border-b border-border-soft last:border-0 hover:bg-white/40 cursor-pointer"
                onClick={() => setActive(c)}
              >
                <td className="px-4 py-3 font-medium text-text-primary">{c.title}</td>
                <td className="px-4 py-3 text-xs text-text-muted">{c.channels.join(", ")}</td>
                <td className="px-4 py-3 text-xs text-text-muted">
                  {c.audienceType.replace(/_/g, " ").toLowerCase()}
                </td>
                <td className="px-4 py-3 font-mono text-xs">{c.sentCount}</td>
                <td className="px-4 py-3 font-mono text-xs text-success">{c.deliveredCount}</td>
                <td className="px-4 py-3 font-mono text-xs text-danger">{c.failedCount}</td>
                <td className="px-4 py-3">
                  <CampaignStatusBadge status={c.status} />
                </td>
                <td className="px-4 py-3 text-2xs text-text-dim">
                  {new Date(c.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {active && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/30 backdrop-blur-sm p-4">
          <div className="glass-panel p-6 w-full max-w-3xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="font-display text-xl">{active.title}</div>
                <div className="text-2xs text-text-dim mt-1">
                  {active.channels.join(" · ")} · {active.recipientCount} recipients
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActive(null)}
                className="text-text-muted hover:text-text-primary"
              >
                ×
              </button>
            </div>
            <pre className="text-sm whitespace-pre-wrap font-sans bg-white/60 rounded p-3 mb-4">
              {active.message}
            </pre>
            <div className="text-2xs uppercase tracking-wider text-text-dim mb-2">
              Deliveries ({activeDeliveries.length})
            </div>
            <div className="divide-y divide-border-soft">
              {activeDeliveries.map((d) => (
                <div key={d.id} className="py-2 flex items-center gap-3 text-sm">
                  <div className="flex-1">
                    <div className="font-medium">{d.recipient?.name ?? "Unknown"}</div>
                    <div className="text-2xs text-text-dim">
                      {d.recipientPhone ?? d.recipientEmail ?? "—"}
                    </div>
                  </div>
                  <Badge tone={d.channel === "WHATSAPP" ? "success" : "info"}>{d.channel}</Badge>
                  <DeliveryStatusBadge status={d.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Analytics ────────────────────────────────────────────

function AnalyticsTab() {
  const [stats, setStats] = useState<DeliveryStats | null>(null);

  useEffect(() => {
    api.get("/api/v1/deliveries/stats").then((r) => setStats(r.data.data));
  }, []);

  const channelColors: Record<string, string> = {
    WHATSAPP: "#059669",
    SMS: "#4F46E5",
    EMAIL: "#F59E0B",
    IN_APP: "#8B5CF6",
  };

  const summary = useMemo(
    () => ({
      total: stats?.totals.sent ?? 0,
      delivered: stats?.totals.delivered ?? 0,
      failed: stats?.totals.failed ?? 0,
      rate: stats?.totals.deliveryRate ?? 0,
      whatsapp: stats?.whatsappTotal ?? 0,
    }),
    [stats],
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatCard label="Total Sent" value={String(summary.total)} />
        <StatCard label="Delivered" value={String(summary.delivered)} accent="success" />
        <StatCard label="Delivery Rate" value={`${summary.rate.toFixed(1)}%`} />
        <StatCard label="Failed" value={String(summary.failed)} accent="danger" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-panel p-5">
          <div className="font-display text-lg mb-3">Daily volume (last 30 days)</div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={stats?.daily ?? []}>
              <CartesianGrid stroke="#E6E3DC" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#8F8D86" }} />
              <YAxis tick={{ fontSize: 10, fill: "#8F8D86" }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#4F46E5" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="glass-panel p-5">
          <div className="font-display text-lg mb-3">Channel breakdown</div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={stats?.byChannel ?? []}
                dataKey="count"
                nameKey="channel"
                outerRadius={80}
                label
              >
                {(stats?.byChannel ?? []).map((entry) => (
                  <Cell key={entry.channel} fill={channelColors[entry.channel] ?? "#8B5CF6"} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-panel p-5">
        <div className="font-display text-lg mb-3">Top event types</div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={stats?.byEvent ?? []}>
            <CartesianGrid stroke="#E6E3DC" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="eventType" tick={{ fontSize: 10, fill: "#8F8D86" }} />
            <YAxis tick={{ fontSize: 10, fill: "#8F8D86" }} />
            <Tooltip />
            <Bar dataKey="count" fill="#4F46E5" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "success" | "danger";
}) {
  return (
    <div className="glass-panel p-4">
      <div className="text-2xs uppercase tracking-wider text-text-dim mb-1">{label}</div>
      <div
        className={`font-display text-2xl ${
          accent === "success" ? "text-success" : accent === "danger" ? "text-danger" : "text-text-primary"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

// ── Settings ─────────────────────────────────────────────

interface ConfigRow {
  eventType: string;
  channel: Channel;
  isEnabled: boolean;
}

function SettingsTab({ onToast }: { onToast: (s: string) => void }) {
  const [items, setItems] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(false);

  const channels: Channel[] = ["WHATSAPP", "SMS", "EMAIL"];

  useEffect(() => {
    api.get("/api/v1/notification-config").then((r) => {
      const m = new Map<string, boolean>();
      for (const row of r.data.data as ConfigRow[]) {
        m.set(`${row.eventType}:${row.channel}`, row.isEnabled);
      }
      setItems(m);
    });
  }, []);

  function key(eventType: string, channel: Channel) {
    return `${eventType}:${channel}`;
  }

  function toggle(eventType: string, channel: Channel, defaultEnabled: boolean) {
    setItems((prev) => {
      const next = new Map(prev);
      const k = key(eventType, channel);
      const cur = next.has(k) ? next.get(k)! : defaultEnabled;
      next.set(k, !cur);
      return next;
    });
  }

  async function save() {
    setLoading(true);
    try {
      const payload = Array.from(items.entries()).map(([k, isEnabled]) => {
        const [eventType, channel] = k.split(":") as [string, Channel];
        return { eventType, channel, isEnabled };
      });
      await api.patch("/api/v1/notification-config", { items: payload });
      onToast("Notification settings saved");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="glass-panel overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-soft text-left text-text-dim">
              <th className="px-4 py-3 font-medium">Event</th>
              {channels.map((c) => (
                <th key={c} className="px-4 py-3 font-medium text-center">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {EVENT_TYPES.map((ev) => (
              <tr key={ev.key} className="border-b border-border-soft last:border-0">
                <td className="px-4 py-3">
                  <div className="font-medium">{ev.label}</div>
                  <div className="text-2xs text-text-dim font-mono">{ev.key}</div>
                </td>
                {channels.map((c) => {
                  const k = key(ev.key, c);
                  const enabled = items.has(k) ? items.get(k)! : true;
                  return (
                    <td key={c} className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={() => toggle(ev.key, c, true)}
                        className="w-4 h-4 rounded cursor-pointer"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end">
        <Button leftIcon={<Bell size={14} />} loading={loading} onClick={save}>
          Save Settings
        </Button>
      </div>
    </div>
  );
}

// ── Badges ───────────────────────────────────────────────

function CampaignStatusBadge({ status }: { status: string }) {
  const tone =
    status === "SENT"
      ? "success"
      : status === "SENDING" || status === "SCHEDULED"
        ? "info"
        : status === "FAILED" || status === "CANCELLED"
          ? "danger"
          : "neutral";
  return <Badge tone={tone}>{status.toLowerCase()}</Badge>;
}

function DeliveryStatusBadge({ status }: { status: string }) {
  const tone =
    status === "DELIVERED" || status === "READ"
      ? "success"
      : status === "SENT" || status === "SENDING" || status === "QUEUED"
        ? "info"
        : status === "FAILED" || status === "REJECTED"
          ? "danger"
          : "neutral";
  return <Badge tone={tone}>{status.toLowerCase()}</Badge>;
}
