import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreVertical, Plus, Search } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { platformApi } from "@/stores/platform-auth";
import {
  Badge,
  Card,
  PLAN_TONES,
  PageHeader,
  STATUS_TONES,
  formatInrCompact,
} from "./shared";
import { CreateTenantModal } from "./CreateTenantModal";

interface TenantRow {
  id: string;
  slug: string;
  name: string;
  status: string;
  plan: string | null;
  subscriptionStatus: string | null;
  maxStudents: number | null;
  monthlyPriceInr: number | string;
  totalPaidInr: number | string;
  studentCount: number;
  batchCount: number;
  owner: { id: string; name: string; email: string } | null;
  createdAt: string;
}

export function TenantsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [plan, setPlan] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["platform", "tenants", search, status, plan],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      if (plan) params.set("plan", plan);
      params.set("pageSize", "100");
      const res = await platformApi.get(
        `/api/v1/platform/tenants?${params.toString()}`,
      );
      return res.data;
    },
  });

  const suspend = useMutation({
    mutationFn: async (id: string) =>
      (await platformApi.post(`/api/v1/platform/tenants/${id}/suspend`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform", "tenants"] }),
  });
  const reactivate = useMutation({
    mutationFn: async (id: string) =>
      (await platformApi.post(`/api/v1/platform/tenants/${id}/reactivate`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform", "tenants"] }),
  });

  const rows: TenantRow[] = data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Tenants"
        subtitle="All institutes on Raquel."
        actions={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Tenant
          </button>
        }
      />

      <Card className="p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search by name or slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-md text-sm"
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="TRIAL">Trial</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-md text-sm"
          >
            <option value="">All plans</option>
            <option value="FREE_TRIAL">Free Trial</option>
            <option value="STARTER">Starter</option>
            <option value="GROWTH">Growth</option>
            <option value="PROFESSIONAL">Professional</option>
            <option value="ENTERPRISE">Enterprise</option>
          </select>
        </div>
      </Card>

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-slate-500 text-left border-b border-slate-200">
              <th className="px-4 py-3">Institute</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3 text-right">Students</th>
              <th className="px-4 py-3 text-right">Batches</th>
              <th className="px-4 py-3 text-right">Monthly</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                  No tenants match these filters.
                </td>
              </tr>
            ) : (
              rows.map((t) => (
                <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      to={`/platform-admin/tenants/${t.id}`}
                      className="font-medium text-blue-700 hover:underline"
                    >
                      {t.name}
                    </Link>
                    <div className="text-xs text-slate-400">
                      {t.slug}.raquel.app
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {t.owner ? (
                      <>
                        <div>{t.owner.name}</div>
                        <div className="text-xs text-slate-400">{t.owner.email}</div>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {t.plan ? (
                      <Badge tone={PLAN_TONES[t.plan] ?? "slate"}>{t.plan}</Badge>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {t.studentCount}
                    {t.maxStudents ? (
                      <span className="text-xs text-slate-400"> / {t.maxStudents}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{t.batchCount}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatInrCompact(Number(t.monthlyPriceInr))}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONES[t.status] ?? "slate"}>
                      {t.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <TenantActions
                      tenant={t}
                      onSuspend={() => suspend.mutate(t.id)}
                      onReactivate={() => reactivate.mutate(t.id)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      <CreateTenantModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function TenantActions({
  tenant,
  onSuspend,
  onReactivate,
}: {
  tenant: TenantRow;
  onSuspend: () => void;
  onReactivate: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="p-1 hover:bg-slate-100 rounded"
      >
        <MoreVertical className="w-4 h-4 text-slate-500" />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-md shadow-lg z-20 py-1">
            <Link
              to={`/platform-admin/tenants/${tenant.id}`}
              className="block px-3 py-1.5 text-xs hover:bg-slate-50"
              onClick={() => setOpen(false)}
            >
              View details
            </Link>
            {tenant.status === "SUSPENDED" ? (
              <button
                type="button"
                onClick={() => {
                  onReactivate();
                  setOpen(false);
                }}
                className="block w-full text-left px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50"
              >
                Reactivate
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Suspend ${tenant.name}? All users will be locked out.`)) {
                    onSuspend();
                  }
                  setOpen(false);
                }}
                className="block w-full text-left px-3 py-1.5 text-xs text-red-700 hover:bg-red-50"
              >
                Suspend
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
