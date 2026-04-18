import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { riskSeverity, SEVERITY_CLASSES } from "@/lib/severity";

interface AtRiskRow {
  studentId: string;
  studentName: string;
  batchName: string | null;
  riskScore: number;
  topReasons: string[];
  suggestedAction: string;
}

export function AtRiskWidget() {
  const [rows, setRows] = useState<AtRiskRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/api/v1/intelligence/at-risk-students", { params: { limit: 5 } })
      .then((r) => setRows(r.data?.data ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="glass-panel p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-600" />
          <h2 className="font-display text-base">At-risk students</h2>
        </div>
        <Link to="/at-risk" className="text-xs text-indigo hover:underline">
          View all →
        </Link>
      </div>
      {loading ? (
        <div className="text-sm text-text-dim">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-text-dim">No students flagged as at-risk.</div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const severity = riskSeverity(r.riskScore);
            return (
              <Link
                key={r.studentId}
                to={`/students/${r.studentId}`}
                className="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-white/60 transition-colors"
              >
                <div
                  className={`px-2 py-1 rounded-md border shrink-0 ${SEVERITY_CLASSES[severity]}`}
                >
                  <div className="text-sm font-semibold leading-none">
                    {Math.round(r.riskScore)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text-primary truncate">
                    {r.studentName}
                  </div>
                  <div className="text-2xs text-text-dim truncate">
                    {r.topReasons[0]?.replace(/_/g, " ") ?? "Low engagement"}
                  </div>
                </div>
                <ChevronRight size={14} className="text-text-dim shrink-0 mt-1.5" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
