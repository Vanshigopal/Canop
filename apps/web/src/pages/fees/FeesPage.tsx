import { Badge, Button } from "@/components/primitives";
import { api } from "@/lib/api";
import { useSocket } from "@/hooks/useSocket";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, IndianRupee, Plus, TrendingUp, Users, Wallet } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FeePlanWizard } from "./FeePlanWizard";
import { CategoryCrud } from "./CategoryCrud";

type Tab = "plans" | "categories" | "overdue" | "trends";

interface Summary {
  totalExpected: number;
  totalCollected: number;
  totalPending: number;
  totalOverdue: number;
  collectionRate: number;
  studentsFullyPaid: number;
  studentsPartiallyPaid: number;
  studentsOverdue: number;
  studentsNoPay: number;
  monthToDate: { amount: number; count: number };
}

interface FeePlan {
  id: string;
  name: string;
  academicYear: string;
  totalAmount: string;
  installmentCount: number;
  installmentFrequency: string;
  batch: { id: string; name: string };
  items: Array<{ amount: string; category: { id: string; name: string } }>;
  _count: { studentFees: number };
}

interface OverdueRow {
  installmentId: string;
  studentFeeId: string;
  installmentNumber: number;
  amount: number;
  outstanding: number;
  lateFee: number;
  dueDate: string;
  daysOverdue: number;
  status: string;
  student: {
    id: string;
    rollNumber: string | null;
    user: { id: string; name: string; phone: string | null };
    batch: { id: string; name: string } | null;
  };
}

interface TrendPoint {
  key: string;
  label: string;
  expected: number;
  collected: number;
}

export function FeesPage() {
  const [tab, setTab] = useState<Tab>("plans");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [plans, setPlans] = useState<FeePlan[]>([]);
  const [overdue, setOverdue] = useState<OverdueRow[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [showWizard, setShowWizard] = useState(false);
  const [toast, setToast] = useState("");
  const [selectedOverdue, setSelectedOverdue] = useState<Set<string>>(new Set());

  const loadSummary = useCallback(async () => {
    const r = await api.get("/api/v1/fees/summary");
    setSummary(r.data.data);
  }, []);
  const loadPlans = useCallback(async () => {
    const r = await api.get("/api/v1/fee-plans");
    setPlans(r.data.data);
  }, []);
  const loadOverdue = useCallback(async () => {
    const r = await api.get("/api/v1/fees/overdue");
    setOverdue(r.data.data);
  }, []);
  const loadTrend = useCallback(async () => {
    const r = await api.get("/api/v1/fees/collection-trend?months=6");
    setTrend(r.data.data);
  }, []);

  useEffect(() => {
    loadSummary();
    loadPlans();
    loadOverdue();
    loadTrend();
    // Also trigger a status refresh on mount
    api.post("/api/v1/fees/update-statuses").catch(() => {});
  }, [loadSummary, loadPlans, loadOverdue, loadTrend]);

  useSocket("payment:received", () => {
    loadSummary();
    loadOverdue();
  });
  useSocket("fee:assigned", () => {
    loadPlans();
    loadSummary();
  });

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  async function sendReminder(ids: string[]) {
    for (const id of ids) {
      console.log(`[fee-reminder] installment=${id} — reminder queued (SMS in Session 8)`);
    }
    setToast(`${ids.length} reminder(s) queued`);
    setSelectedOverdue(new Set());
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl tracking-tight">Fees</h1>
          <p className="text-text-muted text-sm mt-1">
            Fee plans, installment schedules, payments, and collection reports
          </p>
        </div>
        {tab === "plans" && (
          <Button leftIcon={<Plus size={14} />} size="sm" onClick={() => setShowWizard(true)}>
            Create Fee Plan
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          label="Total Expected"
          value={money(summary?.totalExpected)}
          icon={Wallet}
          bg="#E0E7FF"
          fg="#4338CA"
        />
        <MetricCard
          label="Collected"
          value={money(summary?.totalCollected)}
          icon={TrendingUp}
          bg="#BBF7D0"
          fg="#059669"
          sub={
            summary
              ? `${summary.collectionRate.toFixed(1)}% of expected`
              : undefined
          }
        />
        <MetricCard
          label="Pending"
          value={money(summary?.totalPending)}
          icon={IndianRupee}
          bg="#FEF3C7"
          fg="#D97706"
        />
        <MetricCard
          label="Overdue"
          value={money(summary?.totalOverdue)}
          icon={AlertTriangle}
          bg="#FEE2E2"
          fg="#DC2626"
          sub={summary ? `${summary.studentsOverdue} student(s)` : undefined}
          danger
        />
      </div>

      <div className="border-b border-border-soft mb-6 flex gap-1 overflow-x-auto">
        {(["plans", "categories", "overdue", "trends"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              tab === t
                ? "border-indigo text-text-primary"
                : "border-transparent text-text-muted hover:text-text-primary"
            }`}
          >
            {t === "plans"
              ? "Fee Plans"
              : t === "categories"
                ? "Fee Categories"
                : t === "overdue"
                  ? `Overdue${overdue.length ? ` (${overdue.length})` : ""}`
                  : "Collection Trend"}
          </button>
        ))}
      </div>

      {toast && (
        <div className="mb-3 rounded-lg bg-success/10 border border-success/20 px-4 py-2 text-xs text-success">
          {toast}
        </div>
      )}

      {tab === "plans" && (
        <PlansTab
          plans={plans}
          onRefresh={() => {
            loadPlans();
            loadSummary();
          }}
        />
      )}
      {tab === "categories" && <CategoryCrud />}
      {tab === "overdue" && (
        <OverdueTab
          rows={overdue}
          selected={selectedOverdue}
          setSelected={setSelectedOverdue}
          onRemind={sendReminder}
        />
      )}
      {tab === "trends" && <TrendsTab trend={trend} />}

      {showWizard && (
        <FeePlanWizard
          onClose={() => setShowWizard(false)}
          onSuccess={() => {
            setShowWizard(false);
            loadPlans();
            loadSummary();
            setToast("Fee plan created");
          }}
        />
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  bg,
  fg,
  danger,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: typeof Users;
  bg: string;
  fg: string;
  danger?: boolean;
}) {
  return (
    <div className="glass-panel p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-text-muted">{label}</span>
        <div
          className="w-9 h-9 rounded-xl grid place-items-center"
          style={{ background: bg }}
        >
          <Icon size={18} style={{ color: fg }} />
        </div>
      </div>
      <div
        className={`text-2xl font-semibold tracking-tight ${
          danger ? "text-danger" : "text-text-primary"
        }`}
      >
        {value}
      </div>
      {sub && <div className="text-2xs text-text-dim mt-1">{sub}</div>}
    </div>
  );
}

function PlansTab({ plans, onRefresh }: { plans: FeePlan[]; onRefresh: () => void }) {
  const [active, setActive] = useState<FeePlan | null>(null);

  if (plans.length === 0) {
    return (
      <div className="glass-panel p-10 text-center text-text-muted">
        No fee plans yet. Click &quot;Create Fee Plan&quot; to set one up.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((p) => (
          <button
            type="button"
            key={p.id}
            onClick={() => setActive(p)}
            className="glass-panel p-5 text-left hover:-translate-y-0.5 transition-transform"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-muted">{p.batch.name}</span>
              <Badge tone="info">{p.installmentFrequency.toLowerCase()}</Badge>
            </div>
            <div className="font-display text-lg mb-1">{p.name}</div>
            <div className="text-2xs text-text-dim mb-3">AY {p.academicYear}</div>
            <div className="text-2xl font-semibold text-text-primary">
              {money(p.totalAmount)}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-text-muted">
              <span>{p.installmentCount} installments</span>
              <span className="inline-flex items-center gap-1">
                <Users size={12} /> {p._count.studentFees} assigned
              </span>
            </div>
          </button>
        ))}
      </div>
      {active && (
        <PlanDetail plan={active} onClose={() => setActive(null)} onAssigned={onRefresh} />
      )}
    </>
  );
}

function PlanDetail({
  plan,
  onClose,
  onAssigned,
}: {
  plan: FeePlan;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [detail, setDetail] = useState<{
    items: Array<{ amount: string; category: { name: string } }>;
    studentFees: Array<{
      id: string;
      totalAmount: string;
      paidAmount: string;
      pendingAmount: string;
      status: string;
      student: { id: string; user: { name: string } };
    }>;
  } | null>(null);
  const [showAssign, setShowAssign] = useState(false);

  useEffect(() => {
    api.get(`/api/v1/fee-plans/${plan.id}`).then((r) => setDetail(r.data.data));
  }, [plan.id]);

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/30 backdrop-blur-sm p-4">
      <div className="glass-panel p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-xs text-text-muted">{plan.batch.name} · AY {plan.academicYear}</div>
            <div className="font-display text-xl">{plan.name}</div>
          </div>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-text-primary">
            ×
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Summary label="Total" value={money(plan.totalAmount)} />
          <Summary label="Installments" value={String(plan.installmentCount)} />
          <Summary label="Frequency" value={plan.installmentFrequency.toLowerCase()} />
        </div>
        <div className="mb-4">
          <div className="text-2xs uppercase tracking-wider text-text-dim mb-2">Breakdown</div>
          <div className="space-y-1">
            {plan.items.map((i) => (
              <div key={i.category.id} className="flex justify-between text-sm">
                <span>{i.category.name}</span>
                <span className="font-mono">{money(i.amount)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-2xs uppercase tracking-wider text-text-dim">
            Assigned students ({detail?.studentFees.length ?? 0})
          </div>
          <Button size="sm" variant="secondary" onClick={() => setShowAssign(true)}>
            Assign to students
          </Button>
        </div>
        <div className="divide-y divide-border-soft">
          {(detail?.studentFees ?? []).map((sf) => {
            const pct =
              Number(sf.totalAmount) > 0
                ? Math.round((Number(sf.paidAmount) / Number(sf.totalAmount)) * 100)
                : 0;
            return (
              <div key={sf.id} className="py-2 flex items-center gap-3">
                <div className="flex-1">
                  <div className="text-sm font-medium">{sf.student.user.name}</div>
                  <div className="text-2xs text-text-dim">
                    {money(sf.paidAmount)} / {money(sf.totalAmount)} · {pct}% paid
                  </div>
                </div>
                <StatusBadge status={sf.status} />
              </div>
            );
          })}
          {detail && detail.studentFees.length === 0 && (
            <div className="py-6 text-center text-text-dim text-sm">No students assigned yet</div>
          )}
        </div>
        {showAssign && (
          <AssignStudentsModal
            planId={plan.id}
            onClose={() => setShowAssign(false)}
            onAssigned={() => {
              setShowAssign(false);
              api.get(`/api/v1/fee-plans/${plan.id}`).then((r) => setDetail(r.data.data));
              onAssigned();
            }}
          />
        )}
      </div>
    </div>
  );
}

function AssignStudentsModal({
  planId,
  onClose,
  onAssigned,
}: {
  planId: string;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [students, setStudents] = useState<
    Array<{ id: string; user: { name: string }; batch: { name: string } | null }>
  >([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [discountType, setDiscountType] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [discountReason, setDiscountReason] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/api/v1/students?pageSize=100").then((r) => setStudents(r.data.data));
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function submit() {
    if (selected.size === 0) return;
    setLoading(true);
    try {
      const body: Record<string, unknown> = { studentIds: Array.from(selected) };
      if (discountType) body.discountType = discountType;
      const amt = Number(discountAmount);
      if (amt > 0) body.discountAmount = amt;
      if (discountReason) body.discountReason = discountReason;
      await api.post(`/api/v1/fee-plans/${planId}/assign`, body);
      onAssigned();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm p-4">
      <div className="glass-panel p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-3">
          <div className="font-display text-lg">Assign to students</div>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-text-primary">
            ×
          </button>
        </div>
        <div className="max-h-56 overflow-y-auto border border-border-soft rounded mb-3 divide-y divide-border-soft">
          {students.map((s) => (
            <label
              key={s.id}
              className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-white/40"
            >
              <input
                type="checkbox"
                checked={selected.has(s.id)}
                onChange={() => toggle(s.id)}
                className="w-4 h-4 rounded cursor-pointer"
              />
              <span className="text-sm flex-1">{s.user.name}</span>
              <span className="text-2xs text-text-dim">{s.batch?.name ?? "—"}</span>
            </label>
          ))}
        </div>
        <div className="text-2xs uppercase tracking-wider text-text-dim mb-2">Discount (optional)</div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <select
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value)}
            className="rounded-md border border-border-soft bg-white/92 px-3 py-2 text-sm"
          >
            <option value="">No discount</option>
            <option value="SCHOLARSHIP">Scholarship</option>
            <option value="SIBLING">Sibling</option>
            <option value="MERIT">Merit</option>
            <option value="FLAT">Flat</option>
            <option value="CUSTOM">Custom</option>
          </select>
          <input
            type="number"
            placeholder="Amount ₹"
            value={discountAmount}
            onChange={(e) => setDiscountAmount(e.target.value)}
            className="rounded-md border border-border-soft bg-white/92 px-3 py-2 text-sm"
          />
        </div>
        <input
          type="text"
          placeholder="Reason (optional)"
          value={discountReason}
          onChange={(e) => setDiscountReason(e.target.value)}
          className="w-full rounded-md border border-border-soft bg-white/92 px-3 py-2 text-sm mb-3"
        />
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" loading={loading} disabled={selected.size === 0} onClick={submit}>
            Assign {selected.size > 0 ? `(${selected.size})` : ""}
          </Button>
        </div>
      </div>
    </div>
  );
}

function OverdueTab({
  rows,
  selected,
  setSelected,
  onRemind,
}: {
  rows: OverdueRow[];
  selected: Set<string>;
  setSelected: (s: Set<string>) => void;
  onRemind: (ids: string[]) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="glass-panel p-10 text-center text-text-muted">
        No overdue installments — everything is up to date.
      </div>
    );
  }

  function toggle(id: string) {
    const n = new Set(selected);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setSelected(n);
  }
  function toggleAll() {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.installmentId)));
  }

  return (
    <div>
      {selected.size > 0 && (
        <div className="glass-panel p-3 mb-3 flex items-center gap-3">
          <Badge tone="warning">{selected.size} selected</Badge>
          <Button size="sm" variant="secondary" onClick={() => onRemind(Array.from(selected))}>
            Send reminder
          </Button>
        </div>
      )}
      <div className="glass-panel overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-soft text-left text-text-dim">
              <th className="px-3 py-3 w-10">
                <input
                  type="checkbox"
                  checked={selected.size === rows.length}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded cursor-pointer"
                />
              </th>
              <th className="px-4 py-3 font-medium">Student</th>
              <th className="px-4 py-3 font-medium">Batch</th>
              <th className="px-4 py-3 font-medium">Inst.</th>
              <th className="px-4 py-3 font-medium">Due</th>
              <th className="px-4 py-3 font-medium">Overdue</th>
              <th className="px-4 py-3 font-medium">Outstanding</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.installmentId}
                className="border-b border-border-soft last:border-0 hover:bg-white/40 transition-colors"
              >
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(r.installmentId)}
                    onChange={() => toggle(r.installmentId)}
                    className="w-4 h-4 rounded cursor-pointer"
                  />
                </td>
                <td className="px-4 py-3 font-medium text-text-primary">{r.student.user.name}</td>
                <td className="px-4 py-3 text-text-muted">{r.student.batch?.name ?? "—"}</td>
                <td className="px-4 py-3 text-text-muted font-mono">#{r.installmentNumber}</td>
                <td className="px-4 py-3 text-text-muted text-2xs">
                  {new Date(r.dueDate).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <span className="text-danger font-semibold">{r.daysOverdue}d</span>
                </td>
                <td className="px-4 py-3 font-mono">
                  <div>{money(r.outstanding)}</div>
                  {r.lateFee > 0 && (
                    <div className="text-2xs text-danger">+{money(r.lateFee)} late</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TrendsTab({ trend }: { trend: TrendPoint[] }) {
  const totals = useMemo(() => {
    const expected = trend.reduce((s, p) => s + p.expected, 0);
    const collected = trend.reduce((s, p) => s + p.collected, 0);
    return { expected, collected };
  }, [trend]);

  return (
    <div>
      <div className="glass-panel p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="font-display text-lg">Monthly collection</div>
            <div className="text-2xs text-text-dim">Last {trend.length} months</div>
          </div>
          <div className="flex gap-4 text-right">
            <div>
              <div className="text-2xs text-text-dim">Expected</div>
              <div className="text-sm font-semibold">{money(totals.expected)}</div>
            </div>
            <div>
              <div className="text-2xs text-text-dim">Collected</div>
              <div className="text-sm font-semibold text-success">{money(totals.collected)}</div>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
            <CartesianGrid stroke="#E6E3DC" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8F8D86" }} />
            <YAxis
              tick={{ fontSize: 11, fill: "#8F8D86" }}
              tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
            />
            <Tooltip formatter={(v) => money(Number(v))} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="expected" fill="#C7D2FE" name="Expected" radius={[4, 4, 0, 0]} />
            <Bar dataKey="collected" fill="#4F46E5" name="Collected" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="glass-panel overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-soft text-left text-text-dim">
              <th className="px-4 py-3 font-medium">Month</th>
              <th className="px-4 py-3 font-medium text-right">Expected</th>
              <th className="px-4 py-3 font-medium text-right">Collected</th>
              <th className="px-4 py-3 font-medium text-right">Rate</th>
            </tr>
          </thead>
          <tbody>
            {trend.map((p) => {
              const rate = p.expected > 0 ? (p.collected / p.expected) * 100 : 0;
              return (
                <tr key={p.key} className="border-b border-border-soft last:border-0">
                  <td className="px-4 py-3">{p.label}</td>
                  <td className="px-4 py-3 text-right font-mono">{money(p.expected)}</td>
                  <td className="px-4 py-3 text-right font-mono text-success">
                    {money(p.collected)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={rate >= 80 ? "text-success" : rate >= 50 ? "text-warning" : "text-danger"}
                    >
                      {rate.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white/60 px-3 py-2">
      <div className="text-2xs uppercase tracking-wider text-text-dim">{label}</div>
      <div className="text-sm font-semibold text-text-primary capitalize">{value}</div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone: "success" | "warning" | "danger" | "neutral" | "info" =
    status === "PAID"
      ? "success"
      : status === "PARTIALLY_PAID"
        ? "info"
        : status === "OVERDUE"
          ? "danger"
          : status === "DUE"
            ? "warning"
            : status === "WAIVED"
              ? "neutral"
              : "neutral";
  const label = status.replace("_", " ").toLowerCase();
  return <Badge tone={tone}>{label}</Badge>;
}

export function money(n: string | number | undefined | null): string {
  if (n === null || n === undefined || n === "") return "—";
  const v = typeof n === "string" ? Number(n) : n;
  if (Number.isNaN(v)) return "—";
  return `₹${new Intl.NumberFormat("en-IN").format(v)}`;
}

export const Trend = { ArrowUpRight, ArrowDownRight };
