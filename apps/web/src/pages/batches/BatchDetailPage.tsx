import { Badge } from "@/components/primitives";
import { api } from "@/lib/api";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  ClipboardList,
  FileText,
  RotateCcw,
  Users,
  Video,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

interface BatchDetail {
  id: string;
  name: string;
  capacity: number;
  academicYear: string;
  isActive: boolean;
  class: { id: string; name: string };
  _count: { students: number };
  batchSubjects: Array<{ subject: { id: string; name: string }; teacher: { name: string } | null }>;
}

interface Student {
  id: string;
  rollNumber: string | null;
  user: { id: string; name: string; phone: string | null; isActive: boolean };
}

interface Exam {
  id: string;
  name: string;
  type: string;
  status: string;
  examDate: string | null;
  subject: { id: string; name: string } | null;
}

interface Retest {
  id: string;
  scheduledDate: string | null;
  retestMarks: number | null;
  status: string;
  student: { id: string; user: { name: string } };
  exam: { id: string; name: string };
}

interface Assignment {
  id: string;
  title: string;
  deadline: string;
  totalMarks: number | string;
  status: string;
  subject: { id: string; name: string } | null;
  _count?: { submissions: number };
}

interface VideoRow {
  id: string;
  title: string;
  duration: number | null;
  chapterNumber: number | null;
  chapterTitle: string | null;
  subject: { id: string; name: string } | null;
  _count?: { watchSessions: number };
}

interface AttendanceSession {
  id: string;
  scheduledAt: string;
  type: string;
  presentCount: number;
  absentCount: number;
  subject: { id: string; name: string } | null;
}

type Tab = "students" | "exams" | "retests" | "assignments" | "videos" | "attendance";

const TABS: Array<{ key: Tab; label: string; icon: typeof Users }> = [
  { key: "students", label: "Students", icon: Users },
  { key: "exams", label: "Exams", icon: FileText },
  { key: "retests", label: "Retests", icon: RotateCcw },
  { key: "assignments", label: "Assignments", icon: ClipboardList },
  { key: "videos", label: "Videos", icon: Video },
  { key: "attendance", label: "Attendance", icon: Calendar },
];

export function BatchDetailPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const [batch, setBatch] = useState<BatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("students");

  useEffect(() => {
    if (!batchId) return;
    api
      .get(`/api/v1/batches/${batchId}`)
      .then((r) => setBatch(r.data.data))
      .catch(() => setBatch(null))
      .finally(() => setLoading(false));
  }, [batchId]);

  if (loading) return <div className="text-text-dim text-sm">Loading...</div>;
  if (!batch) return <div className="text-text-dim text-sm">Batch not found</div>;

  return (
    <div>
      <Link
        to="/batches"
        className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-primary mb-4"
      >
        <ArrowLeft size={14} /> Back to batches
      </Link>

      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl tracking-tight">{batch.name}</h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-text-muted flex-wrap">
            <span>{batch.class.name}</span>
            <span>·</span>
            <span>{batch.academicYear}</span>
            <Badge tone={batch.isActive ? "success" : "neutral"}>
              {batch.isActive ? "ACTIVE" : "CLOSED"}
            </Badge>
            <span className="inline-flex items-center gap-1">
              <Users size={12} />
              {batch._count.students}/{batch.capacity}
            </span>
          </div>
          {batch.batchSubjects.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {batch.batchSubjects.map((bs) => (
                <span
                  key={bs.subject.id}
                  className="text-2xs px-2 py-0.5 rounded-full bg-pastel-sky/50 text-text-muted"
                >
                  <BookOpen size={10} className="inline mr-0.5" /> {bs.subject.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="sticky top-0 bg-bg-base/80 backdrop-blur-sm z-10 border-b border-border-soft mb-6 flex gap-1 overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                tab === t.key
                  ? "border-[#4F46E5] text-[#4F46E5]"
                  : "border-transparent text-[#2C2C2A] hover:text-text-primary"
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <Icon size={14} /> {t.label}
              </span>
            </button>
          );
        })}
      </div>

      {tab === "students" && <StudentsTab batchId={batch.id} />}
      {tab === "exams" && <ExamsTab batchId={batch.id} />}
      {tab === "retests" && <RetestsTab batchId={batch.id} />}
      {tab === "assignments" && <AssignmentsTab batchId={batch.id} />}
      {tab === "videos" && <VideosTab batchId={batch.id} />}
      {tab === "attendance" && <AttendanceTab batchId={batch.id} />}
    </div>
  );
}

function StudentsTab({ batchId }: { batchId: string }) {
  const [rows, setRows] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api
      .get(`/api/v1/students?batchId=${batchId}&pageSize=200`)
      .then((r) => setRows(r.data.data))
      .finally(() => setLoading(false));
  }, [batchId]);

  if (loading) return <div className="text-text-dim text-sm">Loading...</div>;
  return (
    <div className="glass-panel overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-soft text-left text-text-dim">
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Roll No</th>
            <th className="px-4 py-3 font-medium">Phone</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr
              key={s.id}
              className="border-b border-border-soft last:border-0 hover:bg-white/40 transition-colors"
            >
              <td className="px-4 py-3 font-medium text-text-primary">
                <Link to={`/students/${s.id}`} className="hover:text-indigo transition-colors">
                  {s.user.name}
                </Link>
              </td>
              <td className="px-4 py-3 text-text-muted font-mono text-xs">
                {s.rollNumber ?? "—"}
              </td>
              <td className="px-4 py-3 text-text-muted font-mono text-xs">{s.user.phone ?? "—"}</td>
              <td className="px-4 py-3">
                <Badge tone={s.user.isActive ? "success" : "neutral"}>
                  {s.user.isActive ? "Active" : "Inactive"}
                </Badge>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-text-dim">
                No students in this batch
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ExamsTab({ batchId }: { batchId: string }) {
  const [rows, setRows] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api
      .get(`/api/v1/exams?batchId=${batchId}`)
      .then((r) => setRows(r.data.data))
      .finally(() => setLoading(false));
  }, [batchId]);

  if (loading) return <div className="text-text-dim text-sm">Loading...</div>;
  return (
    <div className="glass-panel overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-soft text-left text-text-dim">
            <th className="px-4 py-3 font-medium">Exam</th>
            <th className="px-4 py-3 font-medium">Subject</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => (
            <tr key={e.id} className="border-b border-border-soft last:border-0 hover:bg-white/40">
              <td className="px-4 py-3 font-medium text-text-primary">{e.name}</td>
              <td className="px-4 py-3 text-text-muted">{e.subject?.name ?? "—"}</td>
              <td className="px-4 py-3 text-text-muted">{e.type.replace("_", " + ")}</td>
              <td className="px-4 py-3 text-text-muted font-mono text-xs">
                {e.examDate ? e.examDate.slice(0, 10) : "—"}
              </td>
              <td className="px-4 py-3">
                <Badge tone={e.status === "PUBLISHED" ? "success" : "neutral"}>{e.status}</Badge>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-text-dim">
                No exams for this batch
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function RetestsTab({ batchId }: { batchId: string }) {
  const [rows, setRows] = useState<Retest[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api
      .get(`/api/v1/retests?batchId=${batchId}`)
      .then((r) => setRows(r.data.data ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [batchId]);

  if (loading) return <div className="text-text-dim text-sm">Loading...</div>;
  return (
    <div className="glass-panel overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-soft text-left text-text-dim">
            <th className="px-4 py-3 font-medium">Student</th>
            <th className="px-4 py-3 font-medium">Original Exam</th>
            <th className="px-4 py-3 font-medium">Retest Date</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Score</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border-soft last:border-0 hover:bg-white/40">
              <td className="px-4 py-3 font-medium text-text-primary">{r.student.user.name}</td>
              <td className="px-4 py-3 text-text-muted">{r.exam.name}</td>
              <td className="px-4 py-3 text-text-muted font-mono text-xs">
                {r.scheduledDate ? r.scheduledDate.slice(0, 10) : "—"}
              </td>
              <td className="px-4 py-3">
                <Badge tone={r.status === "COMPLETED" ? "success" : "neutral"}>{r.status}</Badge>
              </td>
              <td className="px-4 py-3 text-text-primary">{r.retestMarks ?? "—"}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-text-dim">
                No retests for this batch
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function AssignmentsTab({ batchId }: { batchId: string }) {
  const [rows, setRows] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api
      .get(`/api/v1/assignments?batchId=${batchId}`)
      .then((r) => setRows(r.data.data ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [batchId]);

  if (loading) return <div className="text-text-dim text-sm">Loading...</div>;
  return (
    <div className="glass-panel overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-soft text-left text-text-dim">
            <th className="px-4 py-3 font-medium">Title</th>
            <th className="px-4 py-3 font-medium">Subject</th>
            <th className="px-4 py-3 font-medium">Deadline</th>
            <th className="px-4 py-3 font-medium">Submissions</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id} className="border-b border-border-soft last:border-0 hover:bg-white/40">
              <td className="px-4 py-3 font-medium text-text-primary">{a.title}</td>
              <td className="px-4 py-3 text-text-muted">{a.subject?.name ?? "—"}</td>
              <td className="px-4 py-3 text-text-muted font-mono text-xs">
                {new Date(a.deadline).toLocaleString()}
              </td>
              <td className="px-4 py-3 text-text-muted">{a._count?.submissions ?? 0}</td>
              <td className="px-4 py-3">
                <Badge tone={a.status === "PUBLISHED" ? "success" : "neutral"}>{a.status}</Badge>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-text-dim">
                No assignments for this batch
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function VideosTab({ batchId }: { batchId: string }) {
  const [rows, setRows] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api
      .get(`/api/v1/videos?batchId=${batchId}`)
      .then((r) => setRows(r.data.data ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [batchId]);

  if (loading) return <div className="text-text-dim text-sm">Loading...</div>;
  return (
    <div className="glass-panel overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-soft text-left text-text-dim">
            <th className="px-4 py-3 font-medium">Title</th>
            <th className="px-4 py-3 font-medium">Subject</th>
            <th className="px-4 py-3 font-medium">Chapter</th>
            <th className="px-4 py-3 font-medium">Duration</th>
            <th className="px-4 py-3 font-medium">Views</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((v) => (
            <tr key={v.id} className="border-b border-border-soft last:border-0 hover:bg-white/40">
              <td className="px-4 py-3 font-medium text-text-primary">{v.title}</td>
              <td className="px-4 py-3 text-text-muted">{v.subject?.name ?? "—"}</td>
              <td className="px-4 py-3 text-text-muted">
                {v.chapterNumber ? `Ch ${v.chapterNumber}${v.chapterTitle ? ` — ${v.chapterTitle}` : ""}` : "—"}
              </td>
              <td className="px-4 py-3 text-text-muted font-mono text-xs">
                {v.duration ? `${Math.round(v.duration / 60)}m` : "—"}
              </td>
              <td className="px-4 py-3 text-text-muted">{v._count?.watchSessions ?? 0}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-text-dim">
                No videos for this batch
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function AttendanceTab({ batchId }: { batchId: string }) {
  const [rows, setRows] = useState<AttendanceSession[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api
      .get(`/api/v1/attendance/sessions?batchId=${batchId}`)
      .then((r) => setRows(r.data.data ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [batchId]);

  if (loading) return <div className="text-text-dim text-sm">Loading...</div>;
  return (
    <div className="glass-panel overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-soft text-left text-text-dim">
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Subject</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Present/Total</th>
            <th className="px-4 py-3 font-medium">%</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => {
            const total = s.presentCount + s.absentCount;
            const pct = total > 0 ? Math.round((s.presentCount / total) * 100) : 0;
            return (
              <tr key={s.id} className="border-b border-border-soft last:border-0 hover:bg-white/40">
                <td className="px-4 py-3 text-text-muted font-mono text-xs">
                  {new Date(s.scheduledAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-text-muted">{s.subject?.name ?? "—"}</td>
                <td className="px-4 py-3 text-text-muted">{s.type}</td>
                <td className="px-4 py-3 text-text-primary">
                  {s.presentCount}/{total}
                </td>
                <td className="px-4 py-3 text-text-primary font-medium">{pct}%</td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-text-dim">
                No attendance sessions for this batch
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
