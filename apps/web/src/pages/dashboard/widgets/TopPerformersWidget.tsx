import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy } from "lucide-react";
import { api } from "@/lib/api";

interface TopPerformer {
  studentId: string;
  studentName: string;
  batchName: string | null;
  reasons: string[];
}

export function TopPerformersWidget() {
  const [rows, setRows] = useState<TopPerformer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/api/v1/intelligence/top-performers")
      .then((r) => setRows(r.data?.data ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="glass-panel p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-amber-600" />
          <h2 className="font-display text-base">Top performers</h2>
        </div>
      </div>
      {loading ? (
        <div className="text-sm text-text-dim">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-text-dim">
          Not enough data yet. Try again after the first exam is published.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.slice(0, 3).map((r) => (
            <Link
              key={r.studentId}
              to={`/students/${r.studentId}`}
              className="block px-3 py-2 rounded-lg hover:bg-white/60 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-text-primary truncate">
                    {r.studentName}
                  </div>
                  {r.batchName && (
                    <div className="text-2xs text-text-dim">{r.batchName}</div>
                  )}
                </div>
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {r.reasons.slice(0, 2).map((reason) => (
                  <span
                    key={reason}
                    className="text-2xs px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100"
                  >
                    {reason.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
