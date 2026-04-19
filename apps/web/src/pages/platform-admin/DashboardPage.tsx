import {
  CartesianGrid,
  Line,
  LineChart,
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

interface Overview {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  suspendedTenants: number;
  totalStudents: number;
  totalTeachers: number;
  totalBatches: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  revenueTrendPct: number;
  mrr: number;
  arr: number;
  averageStudentsPerTenant: number;
  churnRate: number;
  newTenantsThisMonth: number;
  newTenantsLastMonth: number;
  topTenantsByStudents: Array<{ id: string; name: string; slug: string; studentCount: number }>;
  topTenantsByRevenue: Array<{
    id: string;
    name: string;
    slug: string;
    totalPaidInr: number;
    monthlyPriceInr: number;
    plan: string;
  }>;
}

interface RevenueMonth {
  month: string;
  subscriptionInr: number;
  aiUsageInr: number;
  smsUsageInr: number;
  storageInr: number;
  totalInr: number;
}

export function DashboardPage() {
  const { data: overview, isLoading } = usePlatformQuery<Overview>(
    ["platform", "overview"],
    "/api/v1/platform/analytics/overview",
  );
  const { data: revenue } = usePlatformQuery<RevenueMonth[]>(
    ["platform", "revenue", "12"],
    "/api/v1/platform/analytics/revenue?months=12",
  );

  return (
    <div>
      <PageHeader
        title="Platform Dashboard"
        subtitle="Real-time snapshot of all institutes on Raquel."
      />

      {isLoading || !overview ? (
        <div className="text-slate-500">Loading…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Stat
              label="Total Tenants"
              value={overview.totalTenants}
              subtitle={`${overview.activeTenants} active · ${overview.trialTenants} trial · ${overview.suspendedTenants} suspended`}
            />
            <Stat label="Total Students" value={overview.totalStudents.toLocaleString("en-IN")} />
            <Stat
              label="MRR"
              value={formatInrCompact(overview.mrr)}
              subtitle={`ARR ${formatInrCompact(overview.arr)}`}
            />
            <Stat
              label="Revenue (MTD)"
              value={formatInrCompact(overview.revenueThisMonth)}
              trend={
                overview.revenueTrendPct >= 0
                  ? `+${overview.revenueTrendPct}% vs last month`
                  : `${overview.revenueTrendPct}% vs last month`
              }
            />

            <Stat label="New Tenants (month)" value={overview.newTenantsThisMonth} />
            <Stat label="Churn Rate" value={`${overview.churnRate}%`} />
            <Stat label="Avg Students/Tenant" value={overview.averageStudentsPerTenant} />
            <Stat label="Total Teachers" value={overview.totalTeachers} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <Card className="lg:col-span-2 p-5">
              <div className="text-sm font-medium mb-4">Revenue — last 12 months</div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenue ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748B" }} />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#64748B" }}
                      tickFormatter={(v) => formatInrCompact(v)}
                    />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 6 }}
                      formatter={(v: any) => formatInrCompact(Number(v))}
                    />
                    <Line
                      type="monotone"
                      dataKey="totalInr"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-5">
              <div className="text-sm font-medium mb-4">Top tenants by students</div>
              <div className="space-y-2">
                {overview.topTenantsByStudents.map((t, i) => (
                  <div key={t.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 w-5">{i + 1}.</span>
                      <span className="truncate">{t.name}</span>
                    </div>
                    <span className="text-slate-600 font-medium">{t.studentCount}</span>
                  </div>
                ))}
                {overview.topTenantsByStudents.length === 0 && (
                  <div className="text-xs text-slate-400">No data yet</div>
                )}
              </div>
            </Card>
          </div>

          <Card className="p-5">
            <div className="text-sm font-medium mb-4">Top tenants by revenue</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-slate-500 text-left">
                  <th className="py-2">Institute</th>
                  <th className="py-2">Plan</th>
                  <th className="py-2 text-right">Monthly</th>
                  <th className="py-2 text-right">Total Paid</th>
                </tr>
              </thead>
              <tbody>
                {overview.topTenantsByRevenue.map((t) => (
                  <tr key={t.id} className="border-t border-slate-100">
                    <td className="py-2">
                      <div>{t.name}</div>
                      <div className="text-xs text-slate-400">{t.slug}.raquel.app</div>
                    </td>
                    <td className="py-2 text-slate-600">{t.plan}</td>
                    <td className="py-2 text-right">{formatInrCompact(t.monthlyPriceInr)}</td>
                    <td className="py-2 text-right font-medium">
                      {formatInrCompact(t.totalPaidInr)}
                    </td>
                  </tr>
                ))}
                {overview.topTenantsByRevenue.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-3 text-center text-xs text-slate-400">
                      No revenue recorded yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
