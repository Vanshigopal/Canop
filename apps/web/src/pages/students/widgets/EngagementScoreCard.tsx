import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { engagementSeverity, SEVERITY_CLASSES, SEVERITY_LABEL } from "@/lib/severity";

interface EngagementBreakdown {
  score: number;
  attendanceScore: number;
  marksScore: number;
  assignmentScore: number;
  videoScore: number;
  loginScore: number;
  riskFactors: string[];
}

export function EngagementScoreCard({ studentId }: { studentId: string }) {
  const [breakdown, setBreakdown] = useState<EngagementBreakdown | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    api
      .get(`/api/v1/intelligence/engagement/${studentId}`)
      .then((r) => setBreakdown(r.data?.data ?? null))
      .catch(() => setBreakdown(null));
  }, [studentId]);

  if (!breakdown) {
    return (
      <div className="glass-panel p-4">
        <div className="text-2xs uppercase tracking-wider text-text-dim">Engagement</div>
        <div className="text-sm text-text-dim mt-1">Loading…</div>
      </div>
    );
  }

  const sev = engagementSeverity(breakdown.score);

  return (
    <div
      className="glass-panel p-4 cursor-pointer relative"
      onMouseEnter={() => setShowDetail(true)}
      onMouseLeave={() => setShowDetail(false)}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xs uppercase tracking-wider text-text-dim">Engagement</div>
          <div className="flex items-baseline gap-2 mt-1">
            <div className="text-2xl font-semibold text-text-primary">
              {Math.round(breakdown.score)}
            </div>
            <div className="text-xs text-text-dim">/ 100</div>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-md border text-2xs ${SEVERITY_CLASSES[sev]}`}>
          {SEVERITY_LABEL[sev]}
        </span>
      </div>

      {showDetail && (
        <div className="absolute top-full left-0 right-0 mt-1 z-10 glass-panel p-3 shadow-lg">
          <div className="text-2xs uppercase tracking-wider text-text-dim mb-2">Breakdown</div>
          <div className="space-y-1.5">
            <Row label="Attendance" score={breakdown.attendanceScore} weight="30%" />
            <Row label="Marks" score={breakdown.marksScore} weight="25%" />
            <Row
              label="Assignments"
              score={breakdown.assignmentScore}
              weight="20%"
              placeholder
            />
            <Row label="Videos" score={breakdown.videoScore} weight="15%" placeholder />
            <Row label="Login" score={breakdown.loginScore} weight="10%" />
          </div>
          {breakdown.riskFactors.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border-soft">
              <div className="text-2xs uppercase tracking-wider text-text-dim mb-1">
                Risk factors
              </div>
              <div className="flex flex-wrap gap-1">
                {breakdown.riskFactors.map((f) => (
                  <span
                    key={f}
                    className="text-2xs px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-100"
                  >
                    {f.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  score,
  weight,
  placeholder,
}: {
  label: string;
  score: number;
  weight: string;
  placeholder?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="w-20 text-text-dim">{label}</div>
      <div className="flex-1 h-1.5 bg-bg-warm rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo/70"
          style={{ width: `${Math.round(score)}%` }}
        />
      </div>
      <div className="w-10 text-right tabular-nums text-text-primary">
        {Math.round(score)}
        {placeholder && <span className="text-2xs text-text-dim"> *</span>}
      </div>
      <div className="w-8 text-right text-2xs text-text-dim">{weight}</div>
    </div>
  );
}
