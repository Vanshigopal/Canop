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

export function EngagementDistWidget(_: { config: Record<string, unknown> }) {
  const { data, isLoading } = useQuery({
    queryKey: ["widget-engagement-dist"],
    queryFn: () =>
      api.get("/api/v1/analytics/engagement", { params: { days: 30 } }).then((r) => r.data.data),
    staleTime: 60_000,
  });

  const dist = (data?.scoreDistribution as Array<{
    rangeStart: number;
    rangeEnd: number;
    count: number;
  }> | undefined)?.map((b) => ({
    range: `${Math.round(b.rangeStart)}-${Math.round(b.rangeEnd)}`,
    count: b.count,
  }));

  return (
    <div className="h-full flex flex-col p-4">
      <h3 className="text-sm font-medium mb-2">Engagement Distribution</h3>
      <div className="flex-1 min-h-0">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-text-muted text-xs">
            Loading…
          </div>
        ) : !dist || dist.length === 0 ? (
          <div className="h-full flex items-center justify-center text-text-muted text-xs">
            No engagement snapshots
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dist}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E3DA" />
              <XAxis dataKey="range" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
