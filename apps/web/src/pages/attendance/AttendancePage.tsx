import { Badge, Button } from "@/components/primitives";
import { api } from "@/lib/api";
import {
  CheckCircle2,
  Clock,
  Edit3,
  Info,
  Keyboard,
  Lock,
  QrCode,
  ScanLine,
  UserPlus,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AddGuestModal } from "./AddGuestModal";
import { AttendanceQrModal } from "./AttendanceQrModal";

type AttendanceType = "LECTURE" | "EXAM" | "RETEST";
type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
type AttendanceMethod = "QR_SCAN" | "MANUAL" | "BULK";

interface Batch {
  id: string;
  name: string;
  class: { id: string; name: string };
  batchSubjects: Array<{ subject: { id: string; name: string } }>;
  _count: { students: number };
}

interface Session {
  id: string;
  batchId: string;
  subjectId: string | null;
  type: AttendanceType;
  date: string;
  startTime: string | null;
  endTime: string | null;
  isFinalized: boolean;
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  qrCode: string | null;
  qrExpiresAt: string | null;
  note: string | null;
  batch: { id: string; name: string };
  subject: { id: string; name: string } | null;
  records: AttRecord[];
}

interface AttRecord {
  id: string;
  studentId: string;
  status: AttendanceStatus;
  method: AttendanceMethod;
  isGuestInBatch: boolean;
  homeBatchId: string;
  note: string | null;
  lateMinutes: number | null;
  student: {
    id: string;
    rollNumber: string | null;
    user: { id: string; name: string };
    batch: { id: string; name: string } | null;
  };
}

interface StudentRow {
  id: string;
  rollNumber: string | null;
  user: { id: string; name: string };
  batch: { id: string; name: string } | null;
}

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const STATUS_CONFIG: Record<
  AttendanceStatus,
  { label: string; icon: typeof CheckCircle2; tone: string; bg: string; border: string }
> = {
  PRESENT: {
    label: "Present",
    icon: CheckCircle2,
    tone: "text-success",
    bg: "bg-success/10",
    border: "border-success/30",
  },
  ABSENT: {
    label: "Absent",
    icon: XCircle,
    tone: "text-danger",
    bg: "bg-danger/10",
    border: "border-danger/30",
  },
  LATE: {
    label: "Late",
    icon: Clock,
    tone: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/30",
  },
  EXCUSED: {
    label: "Excused",
    icon: Info,
    tone: "text-indigo",
    bg: "bg-indigo/10",
    border: "border-indigo/30",
  },
};

const METHOD_ICON: Record<AttendanceMethod, typeof ScanLine> = {
  QR_SCAN: ScanLine,
  MANUAL: Keyboard,
  BULK: Edit3,
};

export function AttendancePage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [date, setDate] = useState(todayStr());
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [type, setType] = useState<AttendanceType>("LECTURE");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");

  const [session, setSession] = useState<Session | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [showQr, setShowQr] = useState(false);
  const [showGuest, setShowGuest] = useState(false);

  const selectedBatch = useMemo(
    () => batches.find((b) => b.id === selectedBatchId),
    [batches, selectedBatchId],
  );

  useEffect(() => {
    api.get("/api/v1/batches").then((r) => {
      setBatches(r.data.data);
      if (!selectedBatchId && r.data.data[0]) setSelectedBatchId(r.data.data[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSession = useCallback(async () => {
    if (!selectedBatchId) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        batchId: selectedBatchId,
        date,
        type,
      });
      const res = await api.get(`/api/v1/attendance/sessions?${params}`);
      const list = res.data.data as Session[];
      const match = list.find((s) => s.startTime === startTime) || list[0] || null;
      if (match) {
        const detail = await api.get(`/api/v1/attendance/sessions/${match.id}`);
        setSession(detail.data.data);
      } else {
        setSession(null);
      }
      const studentsRes = await api.get(`/api/v1/batches/${selectedBatchId}/students?pageSize=100`);
      setStudents(studentsRes.data.data.map((s: StudentRow) => s));
    } catch (e: unknown) {
      setError(extractError(e, "Failed to load session"));
    } finally {
      setLoading(false);
    }
  }, [selectedBatchId, date, type, startTime]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  async function startSession() {
    if (!selectedBatchId) return;
    setStarting(true);
    setError("");
    try {
      const res = await api.post("/api/v1/attendance/sessions", {
        batchId: selectedBatchId,
        subjectId: selectedSubjectId || undefined,
        type,
        date,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
      });
      const detail = await api.get(`/api/v1/attendance/sessions/${res.data.data.id}`);
      setSession(detail.data.data);
    } catch (e: unknown) {
      setError(extractError(e, "Failed to start session"));
    } finally {
      setStarting(false);
    }
  }

  async function markAllPresent() {
    if (!session) return;
    try {
      await api.post(`/api/v1/attendance/sessions/${session.id}/mark-all`, {
        status: "PRESENT",
        method: "BULK",
      });
      const detail = await api.get(`/api/v1/attendance/sessions/${session.id}`);
      setSession(detail.data.data);
    } catch (e: unknown) {
      setError(extractError(e, "Failed to mark all"));
    }
  }

  async function markStudent(
    studentId: string,
    status: AttendanceStatus,
    opts?: { lateMinutes?: number; note?: string },
  ) {
    if (!session) return;
    // optimistic update
    setSession((prev) => {
      if (!prev) return prev;
      const existing = prev.records.find((r) => r.studentId === studentId);
      if (existing) {
        return {
          ...prev,
          records: prev.records.map((r) =>
            r.studentId === studentId
              ? {
                  ...r,
                  status,
                  lateMinutes: opts?.lateMinutes ?? r.lateMinutes,
                  note: opts?.note ?? r.note,
                }
              : r,
          ),
        };
      }
      const s = students.find((x) => x.id === studentId);
      if (!s) return prev;
      const placeholder: AttRecord = {
        id: `temp-${studentId}`,
        studentId,
        status,
        method: "MANUAL",
        isGuestInBatch: false,
        homeBatchId: s.batch?.id ?? prev.batchId,
        note: opts?.note ?? null,
        lateMinutes: opts?.lateMinutes ?? null,
        student: {
          id: s.id,
          rollNumber: s.rollNumber,
          user: s.user,
          batch: s.batch,
        },
      };
      return { ...prev, records: [...prev.records, placeholder] };
    });

    try {
      await api.post(`/api/v1/attendance/sessions/${session.id}/mark`, {
        studentId,
        status,
        method: "MANUAL",
        lateMinutes: opts?.lateMinutes,
        note: opts?.note,
      });
      const detail = await api.get(`/api/v1/attendance/sessions/${session.id}`);
      setSession(detail.data.data);
    } catch (e: unknown) {
      setError(extractError(e, "Failed to save"));
      loadSession();
    }
  }

  async function finalizeSession() {
    if (!session) return;
    if (!confirm("Finalize this session? No more edits will be allowed.")) return;
    try {
      await api.post(`/api/v1/attendance/sessions/${session.id}/finalize`);
      const detail = await api.get(`/api/v1/attendance/sessions/${session.id}`);
      setSession(detail.data.data);
    } catch (e: unknown) {
      setError(extractError(e, "Failed to finalize"));
    }
  }

  const rows: Array<{ student: StudentRow; record: AttRecord | null; isGuest: boolean }> =
    useMemo(() => {
      if (!session) return [];
      const byStudent = new Map(session.records.map((r) => [r.studentId, r]));
      const base = students.map((s) => ({
        student: s,
        record: byStudent.get(s.id) ?? null,
        isGuest: false,
      }));
      const extraGuests = session.records
        .filter((r) => !students.some((s) => s.id === r.studentId))
        .map((r) => ({
          student: {
            id: r.studentId,
            rollNumber: r.student.rollNumber,
            user: r.student.user,
            batch: r.student.batch,
          },
          record: r,
          isGuest: true,
        }));
      return [...base, ...extraGuests];
    }, [session, students]);

  const subjectsForBatch = selectedBatch?.batchSubjects ?? [];
  const attendanceCount = session
    ? { present: session.totalPresent, absent: session.totalAbsent, late: session.totalLate }
    : null;

  return (
    <div className="pb-10">
      <div className="mb-6">
        <h1 className="font-display text-2xl tracking-tight">Attendance</h1>
        <p className="text-text-muted text-sm mt-1">
          Mark lectures, exams, and retests — per batch, per session.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-danger/8 border border-danger/20 px-4 py-2.5 text-xs text-danger">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* LEFT PANEL */}
        <div className="glass-panel p-5 space-y-4 h-fit">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-muted">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-md border border-border-soft bg-white/92 px-3.5 py-2.5 text-sm text-text-primary outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/15"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-muted">Batch</label>
            <select
              value={selectedBatchId}
              onChange={(e) => {
                setSelectedBatchId(e.target.value);
                setSelectedSubjectId("");
              }}
              className="w-full rounded-md border border-border-soft bg-white/92 px-3.5 py-2.5 text-sm text-text-primary outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/15"
            >
              <option value="">Select batch...</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} · {b.class.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-muted">Type</label>
            <div className="grid grid-cols-3 gap-1 p-1 bg-white/60 rounded-md border border-border-soft">
              {(["LECTURE", "EXAM", "RETEST"] as AttendanceType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`py-1.5 rounded text-xs font-medium transition-all ${
                    type === t
                      ? "bg-indigo text-white shadow-sm"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {type === "LECTURE" && subjectsForBatch.length > 0 && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-muted">
                Subject (optional)
              </label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full rounded-md border border-border-soft bg-white/92 px-3.5 py-2.5 text-sm text-text-primary outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/15"
              >
                <option value="">No subject</option>
                {subjectsForBatch.map((bs) => (
                  <option key={bs.subject.id} value={bs.subject.id}>
                    {bs.subject.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-muted">Start</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-md border border-border-soft bg-white/92 px-3 py-2.5 text-sm text-text-primary outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/15"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-muted">End</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-md border border-border-soft bg-white/92 px-3 py-2.5 text-sm text-text-primary outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/15"
              />
            </div>
          </div>

          {!session ? (
            <Button fullWidth loading={starting} onClick={startSession}>
              Start Session
            </Button>
          ) : (
            <div className="rounded-md border border-indigo/20 bg-indigo/5 px-3 py-2.5 text-xs text-indigo">
              Session in progress · {session.records.length} records
            </div>
          )}

          {loading && <p className="text-xs text-text-dim">Loading...</p>}
        </div>

        {/* RIGHT PANEL */}
        <div>
          {!session ? (
            <div className="glass-panel p-10 text-center">
              <div className="text-text-dim text-sm">
                {selectedBatch
                  ? `No session for ${selectedBatch.name} on ${date} at ${startTime}. Click "Start Session" to begin.`
                  : "Select a batch and start a session to mark attendance."}
              </div>
            </div>
          ) : (
            <div className="glass-panel overflow-hidden">
              <div className="p-4 border-b border-border-soft flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-text-primary">{session.batch.name}</span>
                    <Badge tone="info">
                      {session.type.charAt(0) + session.type.slice(1).toLowerCase()}
                    </Badge>
                    {session.subject && (
                      <span className="text-xs text-text-muted">· {session.subject.name}</span>
                    )}
                    {session.isFinalized && (
                      <Badge tone="neutral">
                        <Lock size={10} className="mr-0.5" /> Finalized
                      </Badge>
                    )}
                  </div>
                  <div className="text-2xs text-text-dim mt-0.5">
                    {formatDate(session.date)} · {session.startTime ?? "—"} to{" "}
                    {session.endTime ?? "—"}
                  </div>
                </div>
                {!session.isFinalized && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="secondary" size="sm" onClick={markAllPresent}>
                      Mark All Present
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<QrCode size={14} />}
                      onClick={() => setShowQr(true)}
                    >
                      Generate QR
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<UserPlus size={14} />}
                      onClick={() => setShowGuest(true)}
                    >
                      Add Guest
                    </Button>
                    <Button size="sm" leftIcon={<Lock size={14} />} onClick={finalizeSession}>
                      Finalize
                    </Button>
                  </div>
                )}
              </div>

              <div className="divide-y divide-border-soft max-h-[520px] overflow-y-auto">
                {rows.length === 0 && (
                  <div className="py-16 text-center text-sm text-text-dim">
                    No students in this batch yet.
                  </div>
                )}
                {rows.map(({ student, record, isGuest }) => (
                  <StudentRowItem
                    key={student.id}
                    student={student}
                    record={record}
                    isGuestExtra={isGuest}
                    finalized={session.isFinalized}
                    onMark={(status, opts) => markStudent(student.id, status, opts)}
                  />
                ))}
              </div>

              {attendanceCount && (
                <div className="px-4 py-3 border-t border-border-soft bg-white/40 flex items-center gap-4 text-xs">
                  <span className="text-success font-semibold">
                    Present: {attendanceCount.present}
                  </span>
                  <span className="text-danger font-semibold">
                    Absent: {attendanceCount.absent}
                  </span>
                  <span className="text-warning font-semibold">Late: {attendanceCount.late}</span>
                  <span className="text-text-dim">·</span>
                  <span className="text-text-muted">Total: {session.records.length}</span>
                  <span className="ml-auto text-2xs text-text-dim">Changes save automatically</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {session && showQr && (
        <AttendanceQrModal
          sessionId={session.id}
          initialCode={session.qrCode}
          initialExpiresAt={session.qrExpiresAt}
          onClose={() => {
            setShowQr(false);
            loadSession();
          }}
        />
      )}

      {session && showGuest && (
        <AddGuestModal
          sessionId={session.id}
          sessionBatchId={session.batchId}
          onClose={() => setShowGuest(false)}
          onAdded={() => {
            setShowGuest(false);
            loadSession();
          }}
        />
      )}
    </div>
  );
}

interface RowProps {
  student: StudentRow;
  record: AttRecord | null;
  isGuestExtra: boolean;
  finalized: boolean;
  onMark: (status: AttendanceStatus, opts?: { lateMinutes?: number; note?: string }) => void;
}

function StudentRowItem({ student, record, isGuestExtra, finalized, onMark }: RowProps) {
  const status: AttendanceStatus | null = record?.status ?? null;
  const [lateMin, setLateMin] = useState<number>(record?.lateMinutes ?? 0);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState<string>(record?.note ?? "");
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setNote(record?.note ?? "");
    setLateMin(record?.lateMinutes ?? 0);
  }, [record?.id, record?.note, record?.lateMinutes]);

  const isGuest = record?.isGuestInBatch || isGuestExtra;
  const Method = record ? METHOD_ICON[record.method] : null;

  return (
    <div className="px-4 py-3 flex items-center gap-3 hover:bg-white/40 transition-colors">
      <div className="w-9 h-9 rounded-full bg-pastel-sky/70 grid place-items-center text-xs font-semibold text-indigo shrink-0">
        {student.user.name.slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-text-primary truncate">
            {student.user.name}
          </span>
          {student.rollNumber && (
            <span className="text-2xs font-mono text-text-dim">#{student.rollNumber}</span>
          )}
          {isGuest && student.batch && <Badge tone="info">Guest from {student.batch.name}</Badge>}
          {Method && (
            <span className="text-text-dim" title={record?.method ?? ""}>
              <Method size={12} />
            </span>
          )}
        </div>
        {(status === "LATE" || noteOpen || record?.note) && (
          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            {status === "LATE" && (
              <input
                type="number"
                min={0}
                max={180}
                value={lateMin}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setLateMin(v);
                  if (lateTimer.current) clearTimeout(lateTimer.current);
                  lateTimer.current = setTimeout(() => {
                    onMark("LATE", { lateMinutes: v, note });
                  }, 700);
                }}
                disabled={finalized}
                className="w-20 text-xs rounded border border-border-soft bg-white/92 px-2 py-1"
                placeholder="min late"
              />
            )}
            {(noteOpen || record?.note) && (
              <input
                type="text"
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  if (noteTimer.current) clearTimeout(noteTimer.current);
                  noteTimer.current = setTimeout(() => {
                    if (status)
                      onMark(status, {
                        lateMinutes: status === "LATE" ? lateMin : undefined,
                        note: e.target.value,
                      });
                  }, 700);
                }}
                disabled={finalized}
                className="flex-1 text-xs rounded border border-border-soft bg-white/92 px-2 py-1"
                placeholder="note"
              />
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1">
        {(["PRESENT", "ABSENT", "LATE", "EXCUSED"] as AttendanceStatus[]).map((s) => {
          const cfg = STATUS_CONFIG[s];
          const Icon = cfg.icon;
          const active = status === s;
          return (
            <button
              key={s}
              type="button"
              disabled={finalized}
              onClick={() => onMark(s, s === "LATE" ? { lateMinutes: lateMin || 5 } : undefined)}
              className={`w-8 h-8 rounded-md border grid place-items-center transition-all ${
                active
                  ? `${cfg.bg} ${cfg.border} ${cfg.tone}`
                  : "bg-white/60 border-border-soft text-text-dim hover:text-text-muted hover:border-border-strong"
              } ${finalized ? "opacity-50 cursor-not-allowed" : ""}`}
              title={cfg.label}
            >
              <Icon size={14} />
            </button>
          );
        })}
        <button
          type="button"
          disabled={finalized}
          onClick={() => setNoteOpen((v) => !v)}
          className="ml-1 w-7 h-7 rounded-md grid place-items-center text-text-dim hover:text-text-muted hover:bg-white/60 disabled:opacity-50"
          title="Add note"
        >
          <Edit3 size={12} />
        </button>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function extractError(e: unknown, fallback: string): string {
  return (e as { response?: { data?: { title?: string } } })?.response?.data?.title || fallback;
}
