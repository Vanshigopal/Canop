import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api";

export function SubjectPerfWidget({ config }: { config: { months?: number } }) {
  const months = config.months || 6;
  const { data, isLoading } = useQuery({
    queryKey: ["widget-subject-perf", months],
    queryFn: () =>
      api.get("/api/v1/analytics/academic", { params: { months } }).then((r) => r.data.data),
    staleTime: 60_000,
  });

  const rows = data?.subjectComparison as
    | Array<{ subject: string; average: number }>
    | undefined;

  return (
    <div className="h-full flex flex-col p-4">
      <h3 className="text-sm font-medium mb-2">Subject Performance</h3>
      <div className="flex-1 min-h-0">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-text-muted text-xs">
            Loading…
          </div>
        ) : !rows || rows.length === 0 ? (
          <div className="h-full flex items-center justify-center text-text-muted text-xs">
            No subject data
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E3DA" />
              <XAxis dataKey="subject" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="average" fill="#6366F1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
