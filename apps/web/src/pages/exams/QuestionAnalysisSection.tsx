import { Badge } from "@/components/primitives";
import { api } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";

interface QuestionStat {
  questionNumber: number;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  totalResponses: number;
  difficulty: number;
  discrimination: number;
  quality: "excellent" | "good" | "fair" | "poor";
}

interface Payload {
  available: boolean;
  reason?: string;
  sampleSize?: number;
  questions?: QuestionStat[];
}

type SortKey = "q" | "difficulty" | "discrimination";

const qualityTone: Record<QuestionStat["quality"], "success" | "info" | "warning" | "danger"> = {
  excellent: "success",
  good: "info",
  fair: "warning",
  poor: "danger",
};

export function QuestionAnalysisSection({ examId }: { examId: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("q");

  useEffect(() => {
    setLoading(true);
    api
      .get(`/api/v1/intelligence/question-stats/${examId}`)
      .then((r) => setData(r.data.data as Payload))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [examId]);

  const sorted = useMemo(() => {
    if (!data?.questions) return [];
    const copy = [...data.questions];
    if (sortKey === "difficulty")
      copy.sort((a, b) => b.difficulty - a.difficulty);
    else if (sortKey === "discrimination")
      copy.sort((a, b) => a.discrimination - b.discrimination);
    else copy.sort((a, b) => a.questionNumber - b.questionNumber);
    return copy;
  }, [data, sortKey]);

  if (loading) {
    return (
      <div className="glass-panel p-5 text-sm text-text-dim">
        Loading question analysis…
      </div>
    );
  }
  if (!data) return null;
  if (!data.available) {
    return (
      <div className="glass-panel p-5">
        <div className="text-sm font-medium text-text-primary mb-1">
          Question analysis
        </div>
        <div className="text-xs text-text-muted">
          {data.reason ?? "Unavailable"}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel overflow-hidden">
      <div className="px-4 py-3 border-b border-border-soft flex items-center justify-between">
        <div>
          <h3 className="font-display text-sm uppercase tracking-wider text-text-muted">
            Question analysis
          </h3>
          <p className="text-2xs text-text-dim mt-0.5">
            Based on {data.sampleSize} OMR-scanned sheets · difficulty = % incorrect,
            discrimination = top27% − bottom27%
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <label className="text-text-dim">Sort</label>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="bg-white/92 border border-border-soft rounded-md px-2 py-1"
          >
            <option value="q">Question #</option>
            <option value="difficulty">Hardest first</option>
            <option value="discrimination">Weakest first</option>
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white/40 text-2xs uppercase tracking-wider text-text-dim">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Q#</th>
              <th className="text-left px-4 py-3 font-semibold">Correct</th>
              <th className="text-left px-4 py-3 font-semibold">Incorrect</th>
              <th className="text-left px-4 py-3 font-semibold">Skipped</th>
              <th className="text-left px-4 py-3 font-semibold">Difficulty</th>
              <th className="text-left px-4 py-3 font-semibold">Discrimination</th>
              <th className="text-left px-4 py-3 font-semibold">Quality</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-soft">
            {sorted.map((q) => (
              <tr
                key={q.questionNumber}
                className={q.quality === "poor" ? "bg-red-50/50" : "hover:bg-white/50"}
              >
                <td className="px-4 py-2 font-mono tabular-nums">{q.questionNumber}</td>
                <td className="px-4 py-2 text-emerald-700 tabular-nums">
                  {q.correctCount}
                </td>
                <td className="px-4 py-2 text-red-700 tabular-nums">
                  {q.incorrectCount}
                </td>
                <td className="px-4 py-2 text-text-dim tabular-nums">
                  {q.skippedCount}
                </td>
                <td className="px-4 py-2 tabular-nums">
                  {(q.difficulty * 100).toFixed(0)}%
                </td>
                <td className="px-4 py-2 tabular-nums">
                  {q.discrimination.toFixed(2)}
                </td>
                <td className="px-4 py-2">
                  <Badge tone={qualityTone[q.quality]}>{q.quality}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
