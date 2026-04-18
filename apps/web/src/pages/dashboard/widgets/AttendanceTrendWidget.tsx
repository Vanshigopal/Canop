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

interface AttendanceTrendConfig {
  days?: number;
  batchId?: string;
}

export function AttendanceTrendWidget({ config }: { config: AttendanceTrendConfig }) {
  const days = config.days || 30;
  const { data, isLoading } = useQuery({
    queryKey: ["widget-attendance-trend", days, config.batchId],
    queryFn: () => {
      const now = new Date();
      const from = new Date(now);
      from.setDate(from.getDate() - days);
      return api
        .get("/api/v1/analytics/attendance", {
          params: {
            dateFrom: from.toISOString().slice(0, 10),
            dateTo: now.toISOString().slice(0, 10),
            batchId: config.batchId || undefined,
          },
        })
        .then((r) => r.data.data);
    },
    staleTime: 60_000,
  });

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">Attendance Trend</h3>
        <span className="text-xs text-text-muted">Last {days} days</span>
      </div>
      <div className="flex-1 min-h-0">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-text-muted text-xs">
            Loading…
          </div>
        ) : !data?.dailyRates?.length ? (
          <div className="h-full flex items-center justify-center text-text-muted text-xs">
            No attendance recorded
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.dailyRates}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E3DA" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="rate" stroke="#6366F1" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
