import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Badge } from "@/components/primitives";
import { api } from "@/lib/api";

interface AtRiskItem {
  studentId: string;
  studentName: string;
  batchName?: string;
  score: number;
}

export function AtRiskStudentsWidget(_: { config: Record<string, unknown> }) {
  const { data, isLoading } = useQuery<{ leastEngaged: AtRiskItem[] }>({
    queryKey: ["widget-at-risk"],
    queryFn: () =>
      api.get("/api/v1/analytics/engagement", { params: { days: 30 } }).then((r) => r.data.data),
    staleTime: 60_000,
  });

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">At-Risk Students</h3>
        <Link to="/analytics/engagement" className="text-xs text-indigo">
          See all
        </Link>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-text-muted text-xs">
            Loading…
          </div>
        ) : !data?.leastEngaged?.length ? (
          <div className="h-full flex items-center justify-center text-text-muted text-xs">
            No at-risk students
          </div>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {data.leastEngaged.map((s) => (
              <li key={s.studentId} className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="truncate">{s.studentName}</div>
                  <div className="text-xs text-text-muted">{s.batchName || "—"}</div>
                </div>
                <Badge tone="danger">{Math.round(s.score)}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
