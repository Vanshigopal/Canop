import { Badge, Button } from "@/components/primitives";
import { api } from "@/lib/api";
import { AlertTriangle, ChevronDown, ChevronRight, MessageCircle, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface DropoutRow {
  studentId: string;
  studentName: string;
  batchId: string | null;
  batchName: string | null;
  available: boolean;
  reason?: string;
  risk_score?: number;
  probability?: number;
  level?: "low" | "medium" | "high";
  top_factors?: Array<{
    feature: string;
    value: number;
    importance: number;
    contribution: number;
  }>;
  suggestion?: string;
  features?: Record<string, number>;
}

export function DropoutRiskPage() {
  const [rows, setRows] = useState<DropoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [serviceError, setServiceError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [bootstrapping, setBootstrapping] = useState(false);

  async function load() {
    setLoading(true);
    setServiceError("");
    try {
      const r = await api.get("/api/v1/dropout/all");
      setRows(r.data.data);
    } catch (err: unknown) {
      const anyErr = err as {
        response?: { status?: number; data?: { error?: { message?: string } } };
      };
      if (anyErr?.response?.status === 503) {
        setServiceError(
          anyErr.response.data?.error?.message ??
            "ML service unavailable. Start the ml-service container to see predictions.",
        );
      }
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function bootstrap() {
    setBootstrapping(true);
    try {
      await api.post("/api/v1/dropout/bootstrap");
      await load();
    } finally {
      setBootstrapping(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = rows.filter(
    (r) => filterLevel === "all" || r.level === filterLevel,
  );

  const counts = {
    high: rows.filter((r) => r.level === "high").length,
    medium: rows.filter((r) => r.level === "medium").length,
    low: rows.filter((r) => r.level === "low").length,
  };

  const pieData = [
    { name: "High", value: counts.high, color: "#DC2626" },
    { name: "Medium", value: counts.medium, color: "#D97706" },
    { name: "Low", value: counts.low, color: "#059669" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl flex items-center gap-2">
            <AlertTriangle size={22} className="text-red-600" />
            Dropout risk
          </h1>
          <p className="text-sm text-text-dim mt-1">
            ML-driven risk scoring across 18 features. Refreshed on demand.
          </p>
        </div>
        <Button onClick={load} disabled={loading} variant="secondary" size="sm">
          <RefreshCw size={13} /> Refresh
        </Button>
      </div>

      {serviceError && (
        <div className="glass-panel p-4 border-l-4 border-warning">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-text-primary">ML service unavailable</div>
              <div className="text-xs text-text-muted mt-1">{serviceError}</div>
            </div>
            <Button size="sm" onClick={bootstrap} loading={bootstrapping}>
              Retry & bootstrap models
            </Button>
          </div>
        </div>
      )}

      {!serviceError && rows.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="glass-panel p-4">
            <div className="text-2xs uppercase tracking-wider text-text-dim">High risk</div>
            <div className="text-2xl font-semibold text-red-700 mt-1">{counts.high}</div>
          </div>
          <div className="glass-panel p-4">
            <div className="text-2xs uppercase tracking-wider text-text-dim">Medium</div>
            <div className="text-2xl font-semibold text-amber-700 mt-1">{counts.medium}</div>
          </div>
          <div className="glass-panel p-4">
            <div className="text-2xs uppercase tracking-wider text-text-dim">Low</div>
            <div className="text-2xl font-semibold text-emerald-700 mt-1">{counts.low}</div>
          </div>
          <div className="glass-panel p-2 col-span-1">
            <div style={{ width: "100%", height: 70 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    innerRadius={22}
                    outerRadius={32}
                    stroke="none"
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-2xs text-text-dim text-center">Distribution</div>
          </div>
        </div>
      )}

      {!serviceError && (
        <div className="glass-panel overflow-hidden">
          <div className="p-3 border-b border-border-soft flex items-center gap-3">
            <span className="text-xs text-text-muted">Filter:</span>
            {(["all", "high", "medium", "low"] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFilterLevel(lvl)}
                className={`px-2.5 py-1 rounded text-xs ${
                  filterLevel === lvl
                    ? "bg-indigo text-white"
                    : "bg-white/60 text-text-muted hover:bg-white"
                }`}
              >
                {lvl === "all" ? "All" : lvl}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-text-dim">Loading predictions…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-text-dim">
              No predictions available. Bootstrap models first.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-white/40 text-2xs uppercase tracking-wider text-text-dim">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold w-8"></th>
                  <th className="text-left px-4 py-3 font-semibold">Student</th>
                  <th className="text-left px-4 py-3 font-semibold">Batch</th>
                  <th className="text-left px-4 py-3 font-semibold">Risk</th>
                  <th className="text-left px-4 py-3 font-semibold">Level</th>
                  <th className="text-left px-4 py-3 font-semibold">Top factor</th>
                  <th className="text-left px-4 py-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {filtered.map((r) => {
                  const expanded = expandedId === r.studentId;
                  return (
                    <>
                      <tr key={r.studentId} className="hover:bg-white/50">
                        <td className="px-2 py-3">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedId(expanded ? null : r.studentId)
                            }
                            className="text-text-dim hover:text-text-primary"
                          >
                            {expanded ? (
                              <ChevronDown size={14} />
                            ) : (
                              <ChevronRight size={14} />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            to={`/students/${r.studentId}`}
                            className="font-medium hover:underline"
                          >
                            {r.studentName}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-text-muted">
                          {r.batchName ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          {r.available ? (
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-1.5 bg-bg-warm rounded overflow-hidden">
                                <div
                                  className="h-full bg-red-500"
                                  style={{ width: `${r.risk_score}%` }}
                                />
                              </div>
                              <span className="font-mono text-xs">{r.risk_score}</span>
                            </div>
                          ) : (
                            <span className="text-2xs text-text-dim">n/a</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {r.level ? (
                            <Badge
                              tone={
                                r.level === "high"
                                  ? "danger"
                                  : r.level === "medium"
                                    ? "warning"
                                    : "success"
                              }
                            >
                              {r.level}
                            </Badge>
                          ) : (
                            <span className="text-2xs text-text-dim">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-text-muted">
                          {r.top_factors?.[0]?.feature.replace(/_/g, " ") ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Link to={`/communications?studentId=${r.studentId}`}>
                            <Button size="sm" variant="ghost">
                              <MessageCircle size={12} /> Message
                            </Button>
                          </Link>
                        </td>
                      </tr>
                      {expanded && r.available && (
                        <tr className="bg-white/40">
                          <td></td>
                          <td colSpan={6} className="px-4 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <div className="text-2xs uppercase tracking-wider text-text-dim mb-1">
                                  Top risk factors
                                </div>
                                <ul className="space-y-1 text-xs">
                                  {r.top_factors?.map((f) => (
                                    <li
                                      key={f.feature}
                                      className="flex items-center justify-between"
                                    >
                                      <span>{f.feature.replace(/_/g, " ")}</span>
                                      <span className="font-mono text-text-muted">
                                        {f.value.toFixed(2)} · impact{" "}
                                        {(f.contribution * 100).toFixed(1)}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <div className="text-2xs uppercase tracking-wider text-text-dim mb-1">
                                  Suggested action
                                </div>
                                <p className="text-xs text-text-body">{r.suggestion}</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
