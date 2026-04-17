import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button, Input, Badge } from "@/components/primitives";
import { Plus, Users, BookOpen, X } from "lucide-react";

interface Batch {
  id: string;
  name: string;
  capacity: number;
  academicYear: string;
  isActive: boolean;
  class: { id: string; name: string };
  _count: { students: number };
  batchSubjects: Array<{ subject: { name: string }; teacher: { name: string } | null }>;
}

interface ClassOption {
  id: string;
  name: string;
}

export function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", classId: "", capacity: "60", academicYear: "2025-2026" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [b, c] = await Promise.all([api.get("/api/v1/batches"), api.get("/api/v1/classes")]);
      setBatches(b.data.data);
      setClasses(c.data.data);
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
      await api.post("/api/v1/batches", { ...form, capacity: Number(form.capacity) });
      setShowModal(false);
      setForm({ name: "", classId: "", capacity: "60", academicYear: "2025-2026" });
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { title?: string } } })?.response?.data?.title || "Failed to create batch";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl tracking-tight">Batches</h1>
          <p className="text-text-muted text-sm mt-1">{batches.length} batch{batches.length !== 1 ? "es" : ""}</p>
        </div>
        <Button onClick={() => setShowModal(true)} leftIcon={<Plus size={16} />}>Create Batch</Button>
      </div>

      {loading ? (
        <div className="text-text-dim text-sm">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {batches.map((b) => (
            <div key={b.id} className="glass-panel p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-medium text-text-primary">{b.name}</h3>
                  <p className="text-2xs text-text-dim">{b.class.name} &middot; {b.academicYear}</p>
                </div>
                <Badge tone={b.isActive ? "success" : "neutral"}>{b.isActive ? "Active" : "Closed"}</Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-text-muted">
                <span className="flex items-center gap-1.5"><Users size={14} /> {b._count.students}/{b.capacity}</span>
                <span className="flex items-center gap-1.5"><BookOpen size={14} /> {b.batchSubjects.length} subjects</span>
              </div>
              {b.batchSubjects.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {b.batchSubjects.map((bs, i) => (
                    <span key={i} className="text-2xs px-2 py-0.5 rounded-full bg-pastel-sky/50 text-text-muted">
                      {bs.subject.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {batches.length === 0 && (
            <div className="col-span-full text-center py-12 text-text-dim text-sm">No batches created yet</div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}>
          <div className="glass-panel w-full max-w-md mx-4 p-6" style={{ animation: "scaleIn 0.15s ease-out" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg">Create Batch</h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-text-dim hover:text-text-body"><X size={18} /></button>
            </div>
            {error && <div className="mb-4 rounded-lg bg-danger/8 border border-danger/20 px-4 py-2.5 text-xs text-danger">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-3">
              <Input label="Batch Name" placeholder="11-A" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-muted">Class</label>
                <select
                  value={form.classId}
                  onChange={(e) => setForm({ ...form, classId: e.target.value })}
                  required
                  className="w-full rounded-md border border-border-soft bg-white/92 px-3.5 py-2.5 text-sm text-text-primary outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/15"
                >
                  <option value="">Select class...</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Capacity" type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
                <Input label="Academic Year" placeholder="2025-2026" value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} />
              </div>
              <div className="pt-2">
                <Button type="submit" fullWidth loading={saving}>Create Batch</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
