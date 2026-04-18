import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface SubjectStrength {
  subjectId: string;
  subjectName: string;
  studentAverage: number;
  batchAverage: number;
  percentileRank: number;
  classification: "strong" | "above_average" | "average" | "weak";
  examCount: number;
}

const CLASSIFICATION_STYLES: Record<SubjectStrength["classification"], string> = {
  strong: "bg-emerald-100 text-emerald-800 border-emerald-200",
  above_average: "bg-blue-100 text-blue-800 border-blue-200",
  average: "bg-[#F1EFE8] text-[#5F5E5A] border-[#D3D1C7]",
  weak: "bg-red-100 text-red-800 border-red-200",
};

const CLASSIFICATION_LABEL: Record<SubjectStrength["classification"], string> = {
  strong: "Strong",
  above_average: "Above average",
  average: "Average",
  weak: "Weak",
};

export function SubjectStrengthSection({ studentId }: { studentId: string }) {
  const [rows, setRows] = useState<SubjectStrength[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/api/v1/intelligence/subject-strength/${studentId}`)
      .then((r) => setRows(r.data?.data ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) return null;
  if (rows.length === 0) return null;

  return (
    <div className="glass-panel p-5 mb-4">
      <div className="text-2xs uppercase tracking-wider text-text-dim mb-3">
        Subject strength
      </div>
      <div className="flex flex-wrap gap-2">
        {rows.map((r) => (
          <div
            key={r.subjectId}
            title={`Percentile: ${r.percentileRank.toFixed(1)} · ${r.studentAverage.toFixed(1)}% vs batch ${r.batchAverage.toFixed(1)}% · ${r.examCount} exam${r.examCount === 1 ? "" : "s"}`}
            className={`px-3 py-1.5 rounded-md border text-xs inline-flex items-center gap-2 ${CLASSIFICATION_STYLES[r.classification]}`}
          >
            <span className="font-medium">{r.subjectName}</span>
            <span className="text-2xs opacity-80">{CLASSIFICATION_LABEL[r.classification]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
