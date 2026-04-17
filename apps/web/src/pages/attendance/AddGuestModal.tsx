import { Button, Input } from "@/components/primitives";
import { api } from "@/lib/api";
import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";

interface Props {
  sessionId: string;
  sessionBatchId: string;
  onClose: () => void;
  onAdded: () => void;
}

interface StudentSearchResult {
  id: string;
  rollNumber: string | null;
  user: { id: string; name: string; phone: string | null };
  batch: { id: string; name: string } | null;
}

export function AddGuestModal({ sessionId, sessionBatchId, onClose, onAdded }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StudentSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ pageSize: "20" });
        if (query) params.set("search", query);
        const res = await api.get(`/api/v1/students?${params}`);
        const filtered = (res.data.data as StudentSearchResult[]).filter(
          (s) => s.batch?.id !== sessionBatchId,
        );
        setResults(filtered);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, sessionBatchId]);

  async function addGuest(studentId: string) {
    setAdding(studentId);
    setError("");
    try {
      await api.post(`/api/v1/attendance/sessions/${sessionId}/add-guest`, {
        studentId,
        status: "PRESENT",
      });
      onAdded();
    } catch (e: unknown) {
      setError(
        (e as { response?: { data?: { title?: string } } })?.response?.data?.title ||
          "Failed to add guest",
      );
      setAdding(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="glass-panel w-full max-w-lg mx-4 p-6"
        style={{ animation: "scaleIn 0.15s ease-out" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-lg">Add guest student</h2>
            <p className="text-2xs text-text-dim mt-0.5">
              Only students from other batches are shown.
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-text-dim hover:text-text-body">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-danger/8 border border-danger/20 px-4 py-2.5 text-xs text-danger">
            {error}
          </div>
        )}

        <div className="mb-3">
          <Input
            placeholder="Search by name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-border-soft rounded-md border border-border-soft bg-white/40">
          {loading && <div className="p-4 text-xs text-text-dim">Searching...</div>}
          {!loading && results.length === 0 && (
            <div className="p-6 text-center text-xs text-text-dim">
              <Search size={18} className="mx-auto mb-2 text-text-dim" />
              No students found in other batches.
            </div>
          )}
          {results.map((s) => (
            <div key={s.id} className="p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-pastel-sky/70 grid place-items-center text-2xs font-semibold text-indigo">
                {s.user.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-text-primary truncate">{s.user.name}</div>
                <div className="text-2xs text-text-dim flex items-center gap-2">
                  {s.batch && <span>{s.batch.name}</span>}
                  {s.rollNumber && <span className="font-mono">#{s.rollNumber}</span>}
                </div>
              </div>
              <Button
                size="sm"
                loading={adding === s.id}
                disabled={!!adding}
                onClick={() => addGuest(s.id)}
              >
                Add as guest
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
