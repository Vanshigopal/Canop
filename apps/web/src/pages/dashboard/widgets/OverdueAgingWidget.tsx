import { useQuery } from "@tanstack/react-query";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { api } from "@/lib/api";
import { formatIndianCurrency } from "@/lib/indian-numbers";

const COLORS = ["#10B981", "#6366F1", "#F59E0B", "#F97316", "#EF4444"];

export function OverdueAgingWidget(_: { config: Record<string, unknown> }) {
  const { data, isLoading } = useQuery({
    queryKey: ["widget-aging"],
    queryFn: () =>
      api.get("/api/v1/analytics/financial", { params: { months: 6 } }).then((r) => r.data.data),
    staleTime: 60_000,
  });

  const buckets = (data?.agingBuckets as Array<{ label: string; amount: number; count: number }> | undefined)?.filter(
    (b) => b.count > 0,
  );

  return (
    <div className="h-full flex flex-col p-4">
      <h3 className="text-sm font-medium mb-2">Overdue Aging</h3>
      <div className="flex-1 min-h-0">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-text-muted text-xs">
            Loading…
          </div>
        ) : !buckets || buckets.length === 0 ? (
          <div className="h-full flex items-center justify-center text-text-muted text-xs">
            No overdue installments
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={buckets}
                dataKey="amount"
                nameKey="label"
                outerRadius={60}
                label={(entry: unknown) => {
                  const e = entry as { label: string };
                  return e.label;
                }}
              >
                {buckets.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatIndianCurrency(Number(value))} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
