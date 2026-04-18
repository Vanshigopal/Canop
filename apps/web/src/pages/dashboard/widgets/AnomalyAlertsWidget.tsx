import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TrendingDown } from "lucide-react";
import { Badge } from "@/components/primitives";
import { api } from "@/lib/api";

interface AnomalyRow {
  studentId: string;
  studentName: string;
  baselinePercent: number;
  recentPercent: number;
  zScore: number;
  severity: "mild" | "moderate" | "severe";
}

const severityTone: Record<AnomalyRow["severity"], "warning" | "danger" | "neutral"> = {
  mild: "neutral",
  moderate: "warning",
  severe: "danger",
};

export function AnomalyAlertsWidget() {
  const [rows, setRows] = useState<AnomalyRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/api/v1/intelligence/attendance-anomalies")
      .then((r) => setRows(r.data?.data ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="glass-panel p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingDown size={16} className="text-amber-600" />
          <h2 className="font-display text-base">Attendance anomalies</h2>
        </div>
      </div>
      {loading ? (
        <div className="text-sm text-text-dim">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-text-dim">No anomalies detected this week.</div>
      ) : (
        <div className="space-y-2">
          {rows.slice(0, 4).map((r) => (
            <Link
              key={r.studentId}
              to={`/students/${r.studentId}`}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/60 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-text-primary truncate">
                  {r.studentName}
                </div>
                <div className="text-2xs text-text-dim">
                  {r.baselinePercent.toFixed(1)}% → {r.recentPercent.toFixed(1)}%
                  <span className="mx-1">·</span>
                  z = {r.zScore.toFixed(2)}
                </div>
              </div>
              <Badge tone={severityTone[r.severity]}>{r.severity}</Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
