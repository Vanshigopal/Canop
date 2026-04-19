import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  PageHeader,
  Stat,
  formatInrCompact,
  usePlatformQuery,
} from "./shared";

const COLORS = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#6366F1"];

interface RevenueMonth {
  month: string;
  subscriptionInr: number;
  aiUsageInr: number;
  smsUsageInr: number;
  storageInr: number;
  totalInr: number;
}

export function RevenuePage() {
  const { data: revenue } = usePlatformQuery<RevenueMonth[]>(
    ["platform", "revenue", "12"],
    "/api/v1/platform/analytics/revenue?months=12",
  );
  const { data: overview } = usePlatformQuery<any>(
    ["platform", "overview"],
    "/api/v1/platform/analytics/overview",
  );

  const total = (revenue ?? []).reduce((s, r) => s + Number(r.totalInr), 0);

  const planBreakdown = overview?.topTenantsByRevenue ?? [];
  const planMap = new Map<string, number>();
  for (const t of planBreakdown) {
    planMap.set(t.plan, (planMap.get(t.plan) ?? 0) + Number(t.monthlyPriceInr));
  }
  const planData = Array.from(planMap.entries()).map(([plan, value]) => ({
    plan,
    value,
  }));

  return (
    <div>
      <PageHeader
        title="Revenue"
        subtitle="Platform-wide earnings across all institutes."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="MRR" value={formatInrCompact(overview?.mrr ?? 0)} />
        <Stat label="ARR" value={formatInrCompact(overview?.arr ?? 0)} />
        <Stat label="This month" value={formatInrCompact(overview?.revenueThisMonth ?? 0)} />
        <Stat label="12-month total" value={formatInrCompact(total)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2 p-5">
          <div className="text-sm font-medium mb-4">Monthly revenue breakdown</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenue ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748B" }} />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748B" }}
                  tickFormatter={(v) => formatInrCompact(v)}
                />
                <Tooltip formatter={(v: any) => formatInrCompact(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="subscriptionInr" stackId="a" fill="#3B82F6" name="Subscription" />
                <Bar dataKey="aiUsageInr" stackId="a" fill="#8B5CF6" name="AI" />
                <Bar dataKey="smsUsageInr" stackId="a" fill="#10B981" name="SMS" />
                <Bar dataKey="storageInr" stackId="a" fill="#F59E0B" name="Storage" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-sm font-medium mb-4">Revenue by plan</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={planData}
                  dataKey="value"
                  nameKey="plan"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(props: any) => props.plan}
                  style={{ fontSize: 11 }}
                >
                  {planData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => formatInrCompact(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
