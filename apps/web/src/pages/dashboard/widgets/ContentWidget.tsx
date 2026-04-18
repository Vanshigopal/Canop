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

export function ContentWidget({ config }: { config: { days?: number } }) {
  const days = config.days || 30;
  const { data, isLoading } = useQuery({
    queryKey: ["widget-content", days],
    queryFn: () =>
      api.get("/api/v1/analytics/engagement", { params: { days } }).then((r) => r.data.data),
    staleTime: 60_000,
  });

  const rows = data
    ? [
        { type: "Videos", count: data.contentConsumption.videosWatched },
        { type: "Materials", count: data.contentConsumption.materialsDownloaded },
        { type: "Assignments", count: data.contentConsumption.assignmentsSubmitted },
      ]
    : [];

  return (
    <div className="h-full flex flex-col p-4">
      <h3 className="text-sm font-medium mb-2">Content Consumption</h3>
      <div className="flex-1 min-h-0">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-text-muted text-xs">
            Loading…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E3DA" />
              <XAxis dataKey="type" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
