import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button, Input, Badge } from "@/components/primitives";
import { Plus, X } from "lucide-react";

interface Teacher {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  permissions: Record<string, boolean> | null;
  teacherSubjects: Array<{ subject: { id: string; name: string; code: string | null } }>;
}

interface Subject {
  id: string;
  name: string;
  code: string | null;
}

const PERM_LABELS: Record<string, string> = {
  canManageFees: "Manage Fees",
  canApproveAdmissions: "Approve Admissions",
  canManageExams: "Manage Exams",
  canManageAttendance: "Manage Attendance",
  canManageTimetable: "Manage Timetable",
  canSendBroadcasts: "Send Broadcasts",
  canViewAnalytics: "View Analytics",
  canManageContent: "Manage Content",
};

export function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", subjectIds: [] as string[], permissions: {} as Record<string, boolean> });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [t, s] = await Promise.all([
        api.get("/api/v1/teachers"),
        api.get("/api/v1/subjects"),
      ]);
      setTeachers(t.data.data);
      setSubjects(s.data.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const phone = form.phone.startsWith("+") ? form.phone : `+91${form.phone}`;
      await api.post("/api/v1/teachers", { ...form, phone });
      setShowModal(false);
      setForm({ name: "", email: "", phone: "", subjectIds: [], permissions: {} });
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { title?: string } } })?.response?.data?.title || "Failed to add teacher";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl tracking-tight">Teachers</h1>
          <p className="text-text-muted text-sm mt-1">{teachers.length} teacher{teachers.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setShowModal(true)} leftIcon={<Plus size={16} />}>Add Teacher</Button>
      </div>

      {loading ? (
        <div className="text-text-dim text-sm">Loading...</div>
      ) : (
        <div className="glass-panel overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-soft text-left text-text-dim">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Subjects</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t) => (
                <tr key={t.id} className="border-b border-border-soft last:border-0 hover:bg-white/40 transition-colors">
                  <td className="px-4 py-3 font-medium text-text-primary">{t.name}</td>
                  <td className="px-4 py-3 text-text-muted">{t.email}</td>
                  <td className="px-4 py-3 text-text-muted font-mono text-xs">{t.phone}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {t.teacherSubjects.map((ts) => (
                        <Badge key={ts.subject.id} tone="info">{ts.subject.code || ts.subject.name}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={t.isActive ? "success" : "neutral"}>
                      {t.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                </tr>
              ))}
              {teachers.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-text-dim">No teachers yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}>
          <div className="glass-panel w-full max-w-lg mx-4 p-6" style={{ animation: "scaleIn 0.15s ease-out" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg">Add Teacher</h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-text-dim hover:text-text-body"><X size={18} /></button>
            </div>
            {error && <div className="mb-4 rounded-lg bg-danger/8 border border-danger/20 px-4 py-2.5 text-xs text-danger">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-3">
              <Input label="Name" placeholder="Dr. Mehta" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <Input label="Email" type="email" placeholder="mehta@institute.in" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              <Input label="Phone" placeholder="9876543210" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />

              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-muted">Subjects</label>
                <div className="flex flex-wrap gap-2">
                  {subjects.map((s) => (
                    <label key={s.id} className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.subjectIds.includes(s.id)}
                        onChange={(e) => {
                          setForm({
                            ...form,
                            subjectIds: e.target.checked
                              ? [...form.subjectIds, s.id]
                              : form.subjectIds.filter((id) => id !== s.id),
                          });
                        }}
                        className="rounded"
                      />
                      {s.name}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-muted">Permissions</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(PERM_LABELS).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.permissions[key] ?? false}
                        onChange={(e) => setForm({ ...form, permissions: { ...form.permissions, [key]: e.target.checked } })}
                        className="rounded"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" fullWidth loading={saving}>Add Teacher</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
