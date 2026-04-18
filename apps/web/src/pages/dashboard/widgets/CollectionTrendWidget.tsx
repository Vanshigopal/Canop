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
import { formatIndianCurrency } from "@/lib/indian-numbers";

export function CollectionTrendWidget({ config }: { config: { months?: number } }) {
  const months = config.months || 6;
  const { data, isLoading } = useQuery({
    queryKey: ["widget-collection-trend", months],
    queryFn: () =>
      api
        .get("/api/v1/analytics/financial", { params: { months } })
        .then((r) => r.data.data),
    staleTime: 60_000,
  });

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">Fee Collection</h3>
        <span className="text-xs text-text-muted">Last {months} months</span>
      </div>
      <div className="flex-1 min-h-0">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-text-muted text-xs">
            Loading…
          </div>
        ) : !data?.collectionTrend?.length ? (
          <div className="h-full flex items-center justify-center text-text-muted text-xs">
            No payments yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.collectionTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E3DA" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(value) => formatIndianCurrency(Number(value))} />
              <Bar dataKey="amount" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
