import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, MessageCircle } from "lucide-react";
import { Button } from "@/components/primitives";
import { api } from "@/lib/api";
import { SEVERITY_CLASSES, riskSeverity } from "@/lib/severity";

interface AtRiskRow {
  studentId: string;
  studentName: string;
  batchId: string | null;
  batchName: string | null;
  riskScore: number;
  topReasons: string[];
  suggestedAction: string;
  engagementScore: number;
}

type SortKey = "risk" | "name" | "engagement";

export function AtRiskPage() {
  const [rows, setRows] = useState<AtRiskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("risk");

  useEffect(() => {
    api
      .get("/api/v1/intelligence/at-risk-students", { params: { limit: 50 } })
      .then((r) => setRows(r.data?.data ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const sorted = useMemo(() => {
    const copy = [...rows];
    if (sortKey === "risk") copy.sort((a, b) => b.riskScore - a.riskScore);
    else if (sortKey === "engagement")
      copy.sort((a, b) => a.engagementScore - b.engagementScore);
    else copy.sort((a, b) => a.studentName.localeCompare(b.studentName));
    return copy;
  }, [rows, sortKey]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl flex items-center gap-2">
            <AlertTriangle size={22} className="text-red-600" />
            At-risk students
          </h1>
          <p className="text-sm text-text-dim mt-1">
            Priority list for intervention, ranked by risk factors.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-text-dim">Sort by</label>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="text-xs bg-white/92 border border-border-soft rounded-md px-2 py-1.5"
          >
            <option value="risk">Risk score</option>
            <option value="engagement">Engagement</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="glass-panel p-8 text-center text-sm text-text-dim">Loading…</div>
      ) : sorted.length === 0 ? (
        <div className="glass-panel p-8 text-center text-sm text-text-dim">
          No at-risk students identified.
        </div>
      ) : (
        <div className="glass-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/40 text-2xs uppercase tracking-wider text-text-dim">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Student</th>
                  <th className="text-left px-4 py-3 font-semibold">Batch</th>
                  <th className="text-left px-4 py-3 font-semibold">Risk</th>
                  <th className="text-left px-4 py-3 font-semibold">Engagement</th>
                  <th className="text-left px-4 py-3 font-semibold">Top reasons</th>
                  <th className="text-left px-4 py-3 font-semibold">Action</th>
                  <th className="text-left px-4 py-3 font-semibold"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {sorted.map((r) => {
                  const sev = riskSeverity(r.riskScore);
                  return (
                    <tr key={r.studentId} className="hover:bg-white/50">
                      <td className="px-4 py-3">
                        <Link
                          to={`/students/${r.studentId}`}
                          className="font-medium text-text-primary hover:underline"
                        >
                          {r.studentName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {r.batchName ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border ${SEVERITY_CLASSES[sev]}`}
                        >
                          <span className="font-semibold">{Math.round(r.riskScore)}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {Math.round(r.engagementScore)}/100
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {r.topReasons.slice(0, 3).map((reason) => (
                            <span
                              key={reason}
                              className="text-2xs px-1.5 py-0.5 rounded bg-[#F1EFE8] text-[#5F5E5A] border border-[#D3D1C7]"
                            >
                              {reason.replace(/_/g, " ")}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-body text-xs">
                        {r.suggestedAction}
                      </td>
                      <td className="px-4 py-3">
                        <Link to={`/communications?studentId=${r.studentId}`}>
                          <Button size="sm" variant="ghost">
                            <MessageCircle size={13} />
                            Message
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
