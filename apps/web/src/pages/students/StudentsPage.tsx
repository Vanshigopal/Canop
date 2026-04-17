import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Input, Badge } from "@/components/primitives";
import { Search } from "lucide-react";

interface Student {
  id: string;
  rollNumber: string | null;
  enrolledAt: string;
  user: { id: string; name: string; email: string; phone: string | null; isActive: boolean };
  batch: { id: string; name: string } | null;
  class: { id: string; name: string } | null;
}

export function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);

  async function load(q?: string) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("search", q);
      const res = await api.get(`/api/v1/students?${params}`);
      setStudents(res.data.data);
      setTotal(res.data.meta.total);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load(search);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl tracking-tight">Students</h1>
          <p className="text-text-muted text-sm mt-1">{total} enrolled</p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="mb-4 flex gap-2 max-w-md">
        <div className="flex-1">
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className="px-3 py-2 rounded-md bg-white/80 border border-border-soft hover:bg-white transition-colors"
        >
          <Search size={16} className="text-text-muted" />
        </button>
      </form>

      {loading ? (
        <div className="text-text-dim text-sm">Loading...</div>
      ) : (
        <div className="glass-panel overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-soft text-left text-text-dim">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Class</th>
                <th className="px-4 py-3 font-medium">Batch</th>
                <th className="px-4 py-3 font-medium">Roll No</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-b border-border-soft last:border-0 hover:bg-white/40 transition-colors">
                  <td className="px-4 py-3 font-medium text-text-primary">
                    <Link to={`/students/${s.id}`} className="hover:text-indigo transition-colors">
                      {s.user.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-text-muted font-mono text-xs">{s.user.phone}</td>
                  <td className="px-4 py-3 text-text-muted">{s.class?.name || "—"}</td>
                  <td className="px-4 py-3 text-text-muted">{s.batch?.name || "—"}</td>
                  <td className="px-4 py-3 text-text-muted font-mono text-xs">{s.rollNumber || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={s.user.isActive ? "success" : "neutral"}>
                      {s.user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-text-dim">No students enrolled yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
