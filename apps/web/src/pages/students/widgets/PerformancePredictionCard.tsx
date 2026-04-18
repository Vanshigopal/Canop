import { api } from "@/lib/api";
import { TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

interface Prediction {
  subjectId: string;
  subjectName: string;
  available: boolean;
  reason?: string;
  predicted_percentage?: number;
  confidence_interval?: { lower: number; upper: number; level: string };
  confidence?: "low" | "medium" | "high";
}

export function PerformancePredictionCard({ studentId }: { studentId: string }) {
  const [rows, setRows] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/api/v1/dropout/performance/student/${studentId}`)
      .then((r) => setRows(r.data.data ?? []))
      .catch((err) => {
        const anyErr = err as { response?: { status?: number; data?: { error?: { message?: string } } } };
        if (anyErr?.response?.status === 503) {
          setError(
            anyErr.response.data?.error?.message ??
              "ML service offline — predictions unavailable.",
          );
        } else {
          setRows([]);
        }
      })
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) return null;
  if (error) {
    return (
      <div className="glass-panel p-5">
        <div className="flex items-center gap-2 text-text-muted text-sm">
          <TrendingUp size={14} />
          <span>Next-exam prediction unavailable</span>
        </div>
        <p className="text-2xs text-text-dim mt-1">{error}</p>
      </div>
    );
  }
  if (rows.length === 0) return null;

  return (
    <div className="glass-panel p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={14} className="text-indigo" />
        <h3 className="font-display text-sm uppercase tracking-wider text-text-muted">
          Predicted next exam
        </h3>
      </div>
      <div className="space-y-3">
        {rows.map((r) => {
          if (!r.available || r.predicted_percentage == null) {
            return (
              <div key={r.subjectId} className="text-2xs text-text-dim">
                {r.subjectName}: {r.reason ?? "unavailable"}
              </div>
            );
          }
          const pct = r.predicted_percentage;
          const ci = r.confidence_interval;
          const lower = ci?.lower ?? pct - 10;
          const upper = ci?.upper ?? pct + 10;
          return (
            <div key={r.subjectId}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-text-body">{r.subjectName}</span>
                <span className="font-medium tabular-nums">{pct.toFixed(0)}%</span>
              </div>
              <div className="relative h-2 bg-bg-warm rounded mt-1 overflow-hidden">
                <div
                  className="absolute inset-y-0 bg-indigo/30"
                  style={{
                    left: `${lower}%`,
                    width: `${upper - lower}%`,
                  }}
                />
                <div
                  className="absolute inset-y-0 w-[2px] bg-indigo"
                  style={{ left: `${pct}%` }}
                />
              </div>
              <div className="text-2xs text-text-dim mt-0.5">
                {lower.toFixed(0)}% – {upper.toFixed(0)}% ({ci?.level ?? "80%"} CI)
                {r.confidence && (
                  <span className="ml-1 text-text-dim">· {r.confidence} confidence</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
