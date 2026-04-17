import { Badge } from "@/components/primitives";
import { api } from "@/lib/api";
import { ArrowLeft, Calendar, User } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { StudentAttendanceTab } from "./StudentAttendanceTab";

interface Student {
  id: string;
  rollNumber: string | null;
  enrolledAt: string;
  dateOfBirth: string | null;
  gender: string | null;
  city: string | null;
  state: string | null;
  bloodGroup: string | null;
  user: { id: string; name: string; email: string; phone: string | null; isActive: boolean };
  batch: { id: string; name: string } | null;
  class: { id: string; name: string } | null;
  guardians: Array<{
    id: string;
    name: string;
    relation: string;
    phone: string;
    isEmergency: boolean;
  }>;
}

type Tab = "overview" | "attendance";

export function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    if (!id) return;
    api
      .get(`/api/v1/students/${id}`)
      .then((r) => {
        setStudent(r.data.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-text-dim text-sm">Loading...</div>;
  if (!student) return <div className="text-text-dim text-sm">Student not found</div>;

  return (
    <div>
      <Link
        to="/students"
        className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-primary mb-4"
      >
        <ArrowLeft size={14} /> Back to students
      </Link>

      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-pastel-sky/70 grid place-items-center text-lg font-semibold text-indigo">
            {student.user.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="font-display text-2xl tracking-tight">{student.user.name}</h1>
            <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
              {student.rollNumber && <span className="font-mono">#{student.rollNumber}</span>}
              {student.batch && <span>· {student.batch.name}</span>}
              {student.class && <span>· {student.class.name}</span>}
              <Badge tone={student.user.isActive ? "success" : "neutral"}>
                {student.user.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-border-soft mb-6 flex gap-1">
        {(["overview", "attendance"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t
                ? "border-indigo text-text-primary"
                : "border-transparent text-text-muted hover:text-text-primary"
            }`}
          >
            {t === "overview" ? (
              <span className="inline-flex items-center gap-1.5">
                <User size={14} /> Overview
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <Calendar size={14} /> Attendance
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "overview" && <StudentOverview student={student} />}
      {tab === "attendance" && <StudentAttendanceTab studentId={student.id} />}
    </div>
  );
}

function StudentOverview({ student }: { student: Student }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div className="glass-panel p-5">
        <h3 className="font-display text-sm uppercase tracking-wider text-text-muted mb-3">
          Contact
        </h3>
        <dl className="space-y-2 text-sm">
          <Row label="Email" value={student.user.email} />
          <Row label="Phone" value={student.user.phone ?? "—"} />
          <Row label="City" value={student.city ?? "—"} />
          <Row label="State" value={student.state ?? "—"} />
        </dl>
      </div>
      <div className="glass-panel p-5">
        <h3 className="font-display text-sm uppercase tracking-wider text-text-muted mb-3">
          Profile
        </h3>
        <dl className="space-y-2 text-sm">
          <Row
            label="Date of Birth"
            value={student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : "—"}
          />
          <Row label="Gender" value={student.gender ?? "—"} />
          <Row label="Blood group" value={student.bloodGroup ?? "—"} />
          <Row label="Enrolled" value={new Date(student.enrolledAt).toLocaleDateString()} />
        </dl>
      </div>
      <div className="glass-panel p-5 md:col-span-2">
        <h3 className="font-display text-sm uppercase tracking-wider text-text-muted mb-3">
          Guardians
        </h3>
        <div className="space-y-2">
          {student.guardians.length === 0 && (
            <p className="text-xs text-text-dim">No guardians recorded.</p>
          )}
          {student.guardians.map((g) => (
            <div key={g.id} className="flex items-center gap-3 text-sm">
              <span className="text-text-primary font-medium">{g.name}</span>
              <span className="text-text-muted text-xs">· {g.relation}</span>
              <span className="text-text-muted text-xs font-mono">· {g.phone}</span>
              {g.isEmergency && <Badge tone="warning">Emergency</Badge>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-2xs uppercase tracking-wider text-text-dim">{label}</dt>
      <dd className="text-sm text-text-primary">{value}</dd>
    </div>
  );
}
