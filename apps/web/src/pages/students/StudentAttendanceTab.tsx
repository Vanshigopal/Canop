import { Badge } from "@/components/primitives";
import { api } from "@/lib/api";
import { ChevronLeft, ChevronRight, Edit3, Keyboard, ScanLine } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type AttendanceType = "LECTURE" | "EXAM" | "RETEST";
type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
type AttendanceMethod = "QR_SCAN" | "MANUAL" | "BULK";

interface Stats {
  overall: Bucket;
  byType: Record<AttendanceType, Bucket>;
  byMonth: Array<{ month: string; total: number; present: number; percentage: number }>;
  currentStreak: { type: string; days: number } | null;
  longestAbsentStreak: { days: number; from: string; to: string } | null;
}

interface Bucket {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  percentage: number;
}

interface HistoryEntry {
  id: string;
  date: string;
  type: AttendanceType;
  status: AttendanceStatus;
  method: AttendanceMethod;
  batchName: string;
  subjectName: string | null;
  homeBatchName: string | null;
  attendedBatchName: string;
  isGuestInBatch: boolean;
  markedAt: string;
  markedBy: string | null;
  deviceInfo: string | null;
  note: string | null;
  lateMinutes: number | null;
  startTime: string | null;
  endTime: string | null;
}

export function StudentAttendanceTab({ studentId }: { studentId: string }) {
  const [subTab, setSubTab] = useState<AttendanceType>("LECTURE");
  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/api/v1/attendance/student/${studentId}/stats`),
      api.get(`/api/v1/attendance/student/${studentId}/history?type=${subTab}&limit=100`),
    ]).then(([s, h]) => {
      setStats(s.data.data);
      setHistory(h.data.data);
      setLoading(false);
    });
  }, [studentId, subTab]);

  const bucket = stats?.byType[subTab] ?? null;

  const historyForMonth = useMemo(() => {
    return history.filter((h) => h.date.startsWith(month));
  }, [history, month]);

  return (
    <div className="space-y-6">
      {/* Sub tabs */}
      <div className="inline-flex p-1 bg-white/60 rounded-md border border-border-soft">
        {(["LECTURE", "EXAM", "RETEST"] as AttendanceType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setSubTab(t)}
            className={`px-4 py-1.5 rounded text-xs font-medium transition-all ${
              subTab === t
                ? "bg-indigo text-white shadow-sm"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            {t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Stats */}
      {bucket && (
        <div className="glass-panel p-5 flex items-center gap-6 flex-wrap">
          <DonutGauge percentage={bucket.percentage} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 flex-1">
            <Stat label="Total sessions" value={bucket.total} />
            <Stat label="Present" value={bucket.present} tone="success" />
            <Stat label="Absent" value={bucket.absent} tone="danger" />
            <Stat label="Late" value={bucket.late} tone="warning" />
          </div>
          {stats?.currentStreak && (
            <div className="ml-auto text-right">
              <div className="text-2xs uppercase tracking-wider text-text-dim">Current streak</div>
              <div className="text-sm font-medium text-text-primary">
                {stats.currentStreak.days} day{stats.currentStreak.days !== 1 ? "s" : ""}{" "}
                {stats.currentStreak.type}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Calendar heatmap */}
      <div className="glass-panel p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-sm uppercase tracking-wider text-text-muted">
            Calendar
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMonth(shiftMonth(month, -1))}
              className="w-7 h-7 rounded grid place-items-center text-text-muted hover:bg-white/60"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-sm font-medium text-text-primary">{formatMonth(month)}</span>
            <button
              type="button"
              onClick={() => setMonth(shiftMonth(month, 1))}
              className="w-7 h-7 rounded grid place-items-center text-text-muted hover:bg-white/60"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
        <Heatmap month={month} history={historyForMonth} />
        <LegendRow />
      </div>

      {/* History list */}
      <div className="glass-panel overflow-hidden">
        <div className="px-4 py-3 border-b border-border-soft flex items-center justify-between">
          <h3 className="font-display text-sm uppercase tracking-wider text-text-muted">History</h3>
          <span className="text-2xs text-text-dim">{history.length} records</span>
        </div>
        <div className="divide-y divide-border-soft max-h-[520px] overflow-y-auto">
          {loading && <div className="p-6 text-sm text-text-dim">Loading...</div>}
          {!loading && history.length === 0 && (
            <div className="p-8 text-center text-sm text-text-dim">No attendance history yet.</div>
          )}
          {history.map((h) => (
            <HistoryRow key={h.id} entry={h} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: { label: string; value: number; tone?: "success" | "danger" | "warning" }) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "danger"
        ? "text-danger"
        : tone === "warning"
          ? "text-warning"
          : "text-text-primary";
  return (
    <div>
      <div className="text-2xs uppercase tracking-wider text-text-dim">{label}</div>
      <div className={`text-2xl font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}

function DonutGauge({ percentage }: { percentage: number }) {
  const clamped = Math.max(0, Math.min(100, percentage));
  const r = 36;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;
  const color = clamped >= 75 ? "#059669" : clamped >= 50 ? "#D97706" : "#DC2626";
  return (
    <div className="relative w-24 h-24 grid place-items-center">
      <svg width={96} height={96} viewBox="0 0 96 96" className="-rotate-90">
        <circle cx={48} cy={48} r={r} stroke="#E5E7EB" strokeWidth={8} fill="none" />
        <circle
          cx={48}
          cy={48}
          r={r}
          stroke={color}
          strokeWidth={8}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 400ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-xl font-semibold text-text-primary">{clamped.toFixed(1)}%</div>
      </div>
    </div>
  );
}

function Heatmap({ month, history }: { month: string; history: HistoryEntry[] }) {
  const [year, monthNum] = month.split("-").map(Number);
  if (!year || !monthNum) return null;
  const firstDay = new Date(year, monthNum - 1, 1);
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const startWeekday = firstDay.getDay(); // 0=Sun

  const byDay = new Map<number, HistoryEntry[]>();
  for (const h of history) {
    const d = new Date(h.date);
    const dayNum = d.getDate();
    const existing = byDay.get(dayNum) ?? [];
    existing.push(h);
    byDay.set(dayNum, existing);
  }

  const cells: Array<{ day: number | null; entry: HistoryEntry | null; count: number }> = [];
  for (let i = 0; i < startWeekday; i++) {
    cells.push({ day: null, entry: null, count: 0 });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const entries = byDay.get(d) ?? [];
    cells.push({ day: d, entry: entries[0] ?? null, count: entries.length });
  }

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 mb-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="text-2xs text-center text-text-dim">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((cell, i) => (
          <HeatCell key={i} {...cell} />
        ))}
      </div>
    </div>
  );
}

function HeatCell({
  day,
  entry,
  count,
}: { day: number | null; entry: HistoryEntry | null; count: number }) {
  if (day === null) return <div className="aspect-square" />;
  let bg = "#F3F4F6"; // gray default
  let border = "transparent";
  if (entry) {
    if (entry.status === "PRESENT") bg = "#10B981";
    else if (entry.status === "ABSENT") bg = "#EF4444";
    else if (entry.status === "LATE") bg = "#F59E0B";
    else if (entry.status === "EXCUSED") bg = "#6366F1";
    if (entry.isGuestInBatch) border = "#2563EB";
  }
  return (
    <div
      className="aspect-square rounded relative grid place-items-center group cursor-pointer"
      style={{
        background: bg,
        border: border !== "transparent" ? `2px solid ${border}` : undefined,
      }}
      title={
        entry
          ? `${entry.date} · ${entry.status} · ${entry.batchName}${entry.subjectName ? ` · ${entry.subjectName}` : ""}`
          : String(day)
      }
    >
      <span className={`text-2xs font-medium ${entry ? "text-white" : "text-text-dim"}`}>
        {day}
      </span>
      {count > 1 && (
        <span className="absolute -top-1 -right-1 bg-white text-indigo text-[9px] font-bold rounded-full w-3.5 h-3.5 grid place-items-center border border-border-soft">
          {count}
        </span>
      )}
    </div>
  );
}

function LegendRow() {
  const legend = [
    { color: "#10B981", label: "Present" },
    { color: "#EF4444", label: "Absent" },
    { color: "#F59E0B", label: "Late" },
    { color: "#6366F1", label: "Excused" },
    { color: "#F3F4F6", label: "No session" },
  ];
  return (
    <div className="mt-4 flex items-center gap-3 text-2xs text-text-muted flex-wrap">
      {legend.map((l) => (
        <div key={l.label} className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded" style={{ background: l.color }} />
          <span>{l.label}</span>
        </div>
      ))}
      <div className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded" style={{ border: "2px solid #2563EB" }} />
        <span>Guest</span>
      </div>
    </div>
  );
}

const METHOD_ICON: Record<AttendanceMethod, typeof ScanLine> = {
  QR_SCAN: ScanLine,
  MANUAL: Keyboard,
  BULK: Edit3,
};

function HistoryRow({ entry }: { entry: HistoryEntry }) {
  const [expanded, setExpanded] = useState(false);
  const Method = METHOD_ICON[entry.method];
  const statusTone =
    entry.status === "PRESENT"
      ? "success"
      : entry.status === "ABSENT"
        ? "danger"
        : entry.status === "LATE"
          ? "warning"
          : "info";
  return (
    <div className="px-4 py-3">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-medium text-text-primary">
              {formatEntryDate(entry.date)}
            </span>
            {entry.startTime && (
              <span className="text-2xs text-text-dim">
                {entry.startTime}
                {entry.endTime ? ` — ${entry.endTime}` : ""}
              </span>
            )}
            <Badge tone="neutral">{entry.type.charAt(0) + entry.type.slice(1).toLowerCase()}</Badge>
            <Badge tone={statusTone}>{entry.status}</Badge>
          </div>
          <div className="text-xs text-text-muted flex items-center gap-2 flex-wrap">
            <span>{entry.batchName}</span>
            {entry.subjectName && <span>· {entry.subjectName}</span>}
            {entry.isGuestInBatch && entry.homeBatchName && (
              <Badge tone="info">
                {entry.homeBatchName !== entry.attendedBatchName
                  ? `Guest from ${entry.homeBatchName}`
                  : `Attended in ${entry.attendedBatchName}`}
              </Badge>
            )}
          </div>
          <div className="text-2xs text-text-dim mt-1 flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1">
              <Method size={11} /> {entry.method.replace("_", " ")}
            </span>
            {entry.markedBy && <span>· by {entry.markedBy}</span>}
            <span>· {new Date(entry.markedAt).toLocaleString()}</span>
            {entry.lateMinutes && <span className="text-warning">· {entry.lateMinutes}m late</span>}
          </div>
          {entry.note && (
            <div className="text-2xs text-text-muted mt-1 italic">&ldquo;{entry.note}&rdquo;</div>
          )}
          {expanded && entry.deviceInfo && (
            <div className="text-[10px] text-text-dim mt-1 font-mono break-all">
              {entry.deviceInfo}
            </div>
          )}
          {entry.deviceInfo && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-[10px] text-indigo hover:underline mt-1"
            >
              {expanded ? "Hide device" : "Show device"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function formatEntryDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}
