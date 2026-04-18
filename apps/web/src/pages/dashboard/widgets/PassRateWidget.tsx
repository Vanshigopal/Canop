import { useQuery } from "@tanstack/react-query";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api";

export function PassRateWidget({ config }: { config: { months?: number } }) {
  const months = config.months || 6;
  const { data, isLoading } = useQuery({
    queryKey: ["widget-pass-rate", months],
    queryFn: () =>
      api.get("/api/v1/analytics/academic", { params: { months } }).then((r) => r.data.data),
    staleTime: 60_000,
  });

  const evolution = data?.passRateEvolution as Array<{
    examName: string;
    passRate: number;
    average: number;
  }> | undefined;

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">Pass Rate Evolution</h3>
        <span className="text-xs text-text-muted">Last {months} months</span>
      </div>
      <div className="flex-1 min-h-0">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-text-muted text-xs">
            Loading…
          </div>
        ) : !evolution || evolution.length === 0 ? (
          <div className="h-full flex items-center justify-center text-text-muted text-xs">
            No published exams
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={evolution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E3DA" />
              <XAxis dataKey="examName" tick={{ fontSize: 9 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="passRate"
                stroke="#10B981"
                strokeWidth={2}
                dot={{ r: 2 }}
              />
              <Line
                type="monotone"
                dataKey="average"
                stroke="#6366F1"
                strokeWidth={2}
                dot={{ r: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
