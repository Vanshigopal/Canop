import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, PageHeader, Stat, usePlatformQuery } from "./shared";

interface GrowthMonth {
  month: string;
  newTenants: number;
  newStudents: number;
  cumulativeTenants: number;
  cumulativeStudents: number;
}

export function GrowthPage() {
  const { data: growth } = usePlatformQuery<GrowthMonth[]>(
    ["platform", "growth", "12"],
    "/api/v1/platform/analytics/growth?months=12",
  );

  const total = growth?.[growth.length - 1];

  return (
    <div>
      <PageHeader
        title="Growth"
        subtitle="Tenant and student growth over time."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Cumulative tenants" value={total?.cumulativeTenants ?? 0} />
        <Stat label="Cumulative students" value={total?.cumulativeStudents ?? 0} />
        <Stat label="New tenants (this month)" value={total?.newTenants ?? 0} />
        <Stat label="New students (this month)" value={total?.newStudents ?? 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="text-sm font-medium mb-4">New tenants per month</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={growth ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748B" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
                <Tooltip />
                <Bar dataKey="newTenants" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-sm font-medium mb-4">Cumulative student count</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growth ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748B" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="cumulativeStudents"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Students"
                />
                <Line
                  type="monotone"
                  dataKey="cumulativeTenants"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Tenants"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
