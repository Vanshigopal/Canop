import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { platformApi } from "@/stores/platform-auth";
import {
  Badge,
  Card,
  PLAN_TONES,
  PageHeader,
  STATUS_TONES,
  formatInrCompact,
  formatRelativeDate,
} from "./shared";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "owners", label: "Owners" },
  { key: "subscription", label: "Subscription" },
  { key: "features", label: "Features" },
  { key: "analytics", label: "Analytics" },
];

export function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<string>("overview");

  const { data: tenant } = useQuery({
    queryKey: ["platform", "tenants", id],
    queryFn: async () =>
      (await platformApi.get(`/api/v1/platform/tenants/${id}`)).data.data,
    enabled: !!id,
  });

  if (!tenant) {
    return <div className="text-slate-500">Loading…</div>;
  }

  return (
    <div>
      <div className="mb-2">
        <Link
          to="/platform-admin/tenants"
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="w-3 h-3" /> All tenants
        </Link>
      </div>

      <PageHeader
        title={tenant.name}
        subtitle={`${tenant.slug}.raquel.app`}
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={STATUS_TONES[tenant.status] ?? "slate"}>
              {tenant.status}
            </Badge>
            {tenant.subscription?.plan && (
              <Badge tone={PLAN_TONES[tenant.subscription.plan] ?? "slate"}>
                {tenant.subscription.plan}
              </Badge>
            )}
          </div>
        }
      />

      <div className="flex gap-6 border-b border-slate-200 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`pb-2 text-sm transition-colors ${
              tab === t.key
                ? "border-b-2 border-blue-500 text-blue-700 font-medium"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab tenant={tenant} />}
      {tab === "owners" && <OwnersTab tenantId={tenant.id} />}
      {tab === "subscription" && <SubscriptionTab tenantId={tenant.id} />}
      {tab === "features" && <FeaturesTab tenantId={tenant.id} />}
      {tab === "analytics" && <AnalyticsTab tenantId={tenant.id} />}
    </div>
  );
}

function OverviewTab({ tenant }: { tenant: any }) {
  const sub = tenant.subscription;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="p-5">
        <h3 className="text-sm font-medium mb-3">Institute</h3>
        <dl className="space-y-2 text-sm">
          <Row label="Name" value={tenant.name} />
          <Row label="Slug" value={tenant.slug} />
          <Row label="Status" value={tenant.status} />
          <Row label="Timezone" value={tenant.timezone} />
          <Row label="Created" value={formatRelativeDate(tenant.createdAt)} />
        </dl>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-medium mb-3">Usage vs Limits</h3>
        {sub ? (
          <div className="space-y-3 text-sm">
            <Meter
              label="Students"
              current={tenant._count.students}
              max={sub.maxStudents}
            />
            <Meter
              label="Teachers"
              current={tenant._count.users}
              max={sub.maxTeachers}
            />
            <Meter
              label="Batches"
              current={tenant._count.batches}
              max={sub.maxBatches}
            />
            <Meter
              label="Storage (MB)"
              current={Number(sub.currentStorageUsedMb)}
              max={sub.maxStorageGb * 1024}
            />
          </div>
        ) : (
          <div className="text-xs text-slate-400">No subscription</div>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-medium mb-3">Billing</h3>
        {sub ? (
          <dl className="space-y-2 text-sm">
            <Row label="Plan" value={sub.plan} />
            <Row label="Subscription status" value={sub.status} />
            <Row label="Monthly" value={formatInrCompact(sub.monthlyPriceInr)} />
            <Row label="Total paid" value={formatInrCompact(sub.totalPaidInr)} />
            <Row
              label="Trial ends"
              value={sub.trialEndsAt ? formatRelativeDate(sub.trialEndsAt) : "—"}
            />
            <Row
              label="Last payment"
              value={sub.lastPaymentAt ? formatRelativeDate(sub.lastPaymentAt) : "—"}
            />
          </dl>
        ) : (
          <div className="text-xs text-slate-400">No subscription</div>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-medium mb-3">Features</h3>
        {sub ? (
          <div className="space-y-1.5 text-sm">
            <Flag label="AI Assistant" on={sub.aiEnabled} />
            <Flag label="OMR Scanner" on={sub.omrEnabled} />
            <Flag label="Video Lectures" on={sub.videoEnabled} />
            <Flag label="Analytics" on={sub.analyticsEnabled} />
            <Flag label="WhatsApp" on={sub.whatsappEnabled} />
          </div>
        ) : (
          <div className="text-xs text-slate-400">No subscription</div>
        )}
      </Card>
    </div>
  );
}

function OwnersTab({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();
  const { data: owners } = useQuery({
    queryKey: ["platform", "tenants", tenantId, "owners"],
    queryFn: async () =>
      (await platformApi.get(`/api/v1/platform/tenants/${tenantId}/owners`)).data
        .data,
  });

  const resetPwd = useMutation({
    mutationFn: async (userId: string) =>
      (
        await platformApi.post(
          `/api/v1/platform/tenants/${tenantId}/owners/${userId}/reset-password`,
        )
      ).data.data,
    onSuccess: (data) => {
      alert(`New temporary password:\n\n${data.password}\n\nShow this to the owner.`);
    },
  });

  const remove = useMutation({
    mutationFn: async (userId: string) =>
      (
        await platformApi.delete(
          `/api/v1/platform/tenants/${tenantId}/owners/${userId}`,
        )
      ).data,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["platform", "tenants", tenantId] }),
  });

  return (
    <Card>
      <table className="w-full text-sm">
        <thead className="text-xs uppercase tracking-wider text-slate-500">
          <tr className="text-left border-b border-slate-200">
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Last login</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {(owners ?? []).map((o: any) => (
            <tr key={o.id} className="border-t border-slate-100">
              <td className="px-4 py-2.5">{o.name}</td>
              <td className="px-4 py-2.5 text-slate-600">{o.email}</td>
              <td className="px-4 py-2.5 text-slate-500 text-xs">
                {formatRelativeDate(o.lastLoginAt)}
              </td>
              <td className="px-4 py-2.5">
                {o.isActive ? (
                  <Badge tone="green">Active</Badge>
                ) : (
                  <Badge tone="slate">Inactive</Badge>
                )}
              </td>
              <td className="px-4 py-2.5 text-right space-x-3">
                <button
                  type="button"
                  onClick={() => resetPwd.mutate(o.id)}
                  className="text-xs text-blue-700 hover:underline"
                >
                  Reset password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Remove ${o.name}?`)) remove.mutate(o.id);
                  }}
                  className="text-xs text-red-700 hover:underline"
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function SubscriptionTab({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();
  const { data: sub } = useQuery({
    queryKey: ["platform", "tenants", tenantId, "subscription"],
    queryFn: async () =>
      (await platformApi.get(`/api/v1/platform/tenants/${tenantId}/subscription`))
        .data.data,
  });

  const update = useMutation({
    mutationFn: async (data: any) =>
      (
        await platformApi.patch(
          `/api/v1/platform/tenants/${tenantId}/subscription`,
          data,
        )
      ).data.data,
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: ["platform", "tenants", tenantId],
      }),
  });

  if (!sub) return <div className="text-slate-500">Loading…</div>;

  return (
    <Card className="p-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          update.mutate({
            plan: form.get("plan"),
            maxStudents: Number(form.get("maxStudents")),
            maxTeachers: Number(form.get("maxTeachers")),
            maxBatches: Number(form.get("maxBatches")),
            maxStorageGb: Number(form.get("maxStorageGb")),
            monthlyPriceInr: Number(form.get("monthlyPriceInr")),
          });
        }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <Field label="Plan">
          <select
            name="plan"
            defaultValue={sub.plan}
            className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm"
          >
            <option value="FREE_TRIAL">Free Trial</option>
            <option value="STARTER">Starter</option>
            <option value="GROWTH">Growth</option>
            <option value="PROFESSIONAL">Professional</option>
            <option value="ENTERPRISE">Enterprise</option>
            <option value="CUSTOM">Custom</option>
          </select>
        </Field>

        <Field label="Monthly Price (₹)">
          <input
            name="monthlyPriceInr"
            type="number"
            step="1"
            min="0"
            defaultValue={Number(sub.monthlyPriceInr)}
            className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm"
          />
        </Field>

        <Field label="Max Students">
          <input
            name="maxStudents"
            type="number"
            min="1"
            defaultValue={sub.maxStudents}
            className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm"
          />
        </Field>

        <Field label="Max Teachers">
          <input
            name="maxTeachers"
            type="number"
            min="1"
            defaultValue={sub.maxTeachers}
            className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm"
          />
        </Field>

        <Field label="Max Batches">
          <input
            name="maxBatches"
            type="number"
            min="1"
            defaultValue={sub.maxBatches}
            className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm"
          />
        </Field>

        <Field label="Max Storage (GB)">
          <input
            name="maxStorageGb"
            type="number"
            min="1"
            defaultValue={sub.maxStorageGb}
            className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm"
          />
        </Field>

        <div className="md:col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={update.isPending}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-medium rounded-md"
          >
            {update.isPending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </Card>
  );
}

function FeaturesTab({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();
  const { data: sub } = useQuery({
    queryKey: ["platform", "tenants", tenantId, "subscription"],
    queryFn: async () =>
      (await platformApi.get(`/api/v1/platform/tenants/${tenantId}/subscription`))
        .data.data,
  });

  const toggle = useMutation({
    mutationFn: async (data: Record<string, boolean>) =>
      (
        await platformApi.patch(
          `/api/v1/platform/tenants/${tenantId}/features`,
          data,
        )
      ).data.data,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["platform", "tenants", tenantId] }),
  });

  if (!sub) return <div className="text-slate-500">Loading…</div>;

  const FEATURES: Array<{ key: string; label: string; description: string }> = [
    { key: "aiEnabled", label: "AI Assistant", description: "Claude-powered help text, grading, nudges" },
    { key: "omrEnabled", label: "OMR Scanner", description: "Auto-grade bubble sheets" },
    { key: "videoEnabled", label: "Video Lectures", description: "Host and stream video via Bunny" },
    { key: "analyticsEnabled", label: "Analytics", description: "Attendance, academic, financial, engagement" },
    { key: "whatsappEnabled", label: "WhatsApp", description: "Send notifications via Gupshup WA" },
  ];

  return (
    <Card className="p-5 space-y-3">
      {FEATURES.map((f) => (
        <div
          key={f.key}
          className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0"
        >
          <div>
            <div className="text-sm font-medium">{f.label}</div>
            <div className="text-xs text-slate-500">{f.description}</div>
          </div>
          <button
            type="button"
            onClick={() => toggle.mutate({ [f.key]: !sub[f.key] })}
            className={`w-11 h-6 rounded-full relative transition-colors ${
              sub[f.key] ? "bg-emerald-500" : "bg-slate-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform ${
                sub[f.key] ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>
      ))}
    </Card>
  );
}

function AnalyticsTab({ tenantId }: { tenantId: string }) {
  const { data } = useQuery({
    queryKey: ["platform", "tenants", tenantId, "analytics"],
    queryFn: async () =>
      (await platformApi.get(`/api/v1/platform/analytics/tenant/${tenantId}`))
        .data.data,
  });
  if (!data) return <div className="text-slate-500">Loading…</div>;

  const counts = data.counts;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <MiniStat label="Students" value={counts.students} />
      <MiniStat label="Teachers" value={counts.teachers} />
      <MiniStat label="Batches" value={counts.batches} />
      <MiniStat label="Attendance Sessions" value={counts.attendanceSessions} />
      <MiniStat label="Exams" value={counts.exams} />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-900 font-medium">{value}</dd>
    </div>
  );
}

function Flag({ label, on }: { label: string; on: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-700">{label}</span>
      {on ? <Badge tone="green">Enabled</Badge> : <Badge tone="slate">Off</Badge>}
    </div>
  );
}

function Meter({
  label,
  current,
  max,
}: {
  label: string;
  current: number;
  max: number;
}) {
  const pct = Math.min(100, max > 0 ? (current / max) * 100 : 0);
  const tone = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-600">{label}</span>
        <span className="text-slate-500">
          {current} / {max}
        </span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
