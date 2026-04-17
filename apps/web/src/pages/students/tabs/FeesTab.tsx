import { Badge, Button } from "@/components/primitives";
import { api } from "@/lib/api";
import { useSocket } from "@/hooks/useSocket";
import { useAuthStore } from "@/stores/auth";
import { AlertCircle, Check, Clock, IndianRupee, Receipt as ReceiptIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface StudentFee {
  id: string;
  totalAmount: string;
  discountAmount: string;
  discountType: string | null;
  discountReason: string | null;
  paidAmount: string;
  pendingAmount: string;
  status: string;
  plan: {
    id: string;
    name: string;
    academicYear: string;
    lateFeeAmount: string | null;
    gracePeriodDays: number;
    batch: { id: string; name: string };
    items: Array<{ amount: string; category: { id: string; name: string } }>;
  };
  installments: Array<{
    id: string;
    installmentNumber: number;
    amount: string;
    paidAmount: string;
    lateFee: string;
    dueDate: string;
    status: string;
    paidAt: string | null;
  }>;
  payments: Array<{
    id: string;
    amount: string;
    method: string;
    status: string;
    receiptNumber: string | null;
    paidAt: string | null;
    createdAt: string;
    collectedBy: { id: string; name: string } | null;
  }>;
}

export function FeesTab({ studentId }: { studentId: string }) {
  const [fees, setFees] = useState<StudentFee[]>([]);
  const [loading, setLoading] = useState(true);
  const role = useAuthStore((s) => s.user?.role);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get(`/api/v1/student-fees/${studentId}`);
      setFees(r.data.data);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  useSocket("payment:received", () => load());
  useSocket("fee:assigned", () => load());

  if (loading) return <div className="text-sm text-text-dim">Loading...</div>;

  if (fees.length === 0) {
    return (
      <div className="glass-panel p-10 text-center text-text-muted">
        No fee plans assigned yet. Admin can assign a fee plan from the Fees page.
      </div>
    );
  }

  const canPay = role === "STUDENT" || role === "PARENT";

  return (
    <div className="space-y-5">
      {fees.map((f) => (
        <FeeCard key={f.id} fee={f} canPay={canPay} onPaid={load} />
      ))}
    </div>
  );
}

function FeeCard({
  fee,
  canPay,
  onPaid,
}: {
  fee: StudentFee;
  canPay: boolean;
  onPaid: () => void;
}) {
  const total = Number(fee.totalAmount);
  const paid = Number(fee.paidAmount);
  const pending = Number(fee.pendingAmount);
  const pct = total > 0 ? Math.round((paid / total) * 100) : 0;

  return (
    <div className="glass-panel p-5">
      <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
        <div>
          <div className="font-display text-lg">{fee.plan.name}</div>
          <div className="text-2xs text-text-dim">
            {fee.plan.batch.name} · AY {fee.plan.academicYear}
          </div>
        </div>
        <FeeStatusBadge status={fee.status} />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <Metric label="Total" value={money(total)} />
        <Metric label="Paid" value={money(paid)} tone="success" />
        <Metric
          label="Pending"
          value={money(pending)}
          tone={pending > 0 ? "warning" : "muted"}
        />
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-2xs text-text-muted mb-1">
          <span>{pct}% paid</span>
          {Number(fee.discountAmount) > 0 && (
            <span className="text-info">
              {fee.discountType ?? "Discount"}: ₹{Number(fee.discountAmount).toLocaleString("en-IN")}
            </span>
          )}
        </div>
        <div className="h-2 bg-border-soft rounded-full overflow-hidden">
          <div
            className="h-full bg-success transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="mb-4">
        <div className="text-2xs uppercase tracking-wider text-text-dim mb-2">Installments</div>
        <Timeline installments={fee.installments} canPay={canPay} studentFeeId={fee.id} onPaid={onPaid} />
      </div>

      {fee.payments.length > 0 && (
        <div>
          <div className="text-2xs uppercase tracking-wider text-text-dim mb-2">Payments</div>
          <div className="rounded-md border border-border-soft divide-y divide-border-soft overflow-hidden">
            {fee.payments.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 px-3 py-2 hover:bg-white/40 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-success/10 grid place-items-center">
                  <ReceiptIcon size={14} className="text-success" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">
                    {money(p.amount)} · {p.method.replace("_", " ").toLowerCase()}
                  </div>
                  <div className="text-2xs text-text-dim">
                    {new Date(p.paidAt ?? p.createdAt).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                    {p.collectedBy ? ` · collected by ${p.collectedBy.name}` : ""}
                  </div>
                </div>
                {p.receiptNumber && (
                  <span className="font-mono text-2xs text-text-muted">{p.receiptNumber}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Timeline({
  installments,
  canPay,
  studentFeeId,
  onPaid,
}: {
  installments: StudentFee["installments"];
  canPay: boolean;
  studentFeeId: string;
  onPaid: () => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <ol className="relative border-l border-border-soft ml-3 space-y-4 pt-2">
      {installments.map((i) => {
        const owed =
          Number(i.amount) + Number(i.lateFee) - Number(i.paidAmount);
        const due = new Date(i.dueDate);
        const daysOverdue =
          i.status === "OVERDUE"
            ? Math.floor((today.getTime() - due.getTime()) / 86400000)
            : 0;

        const { bg, fg, Icon } = timelineMarker(i.status);

        return (
          <li key={i.id} className="ml-5 relative">
            <span
              className="absolute -left-[31px] top-0 w-6 h-6 rounded-full grid place-items-center ring-4 ring-white"
              style={{ background: bg }}
            >
              <Icon size={12} style={{ color: fg }} />
            </span>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="text-sm font-medium">
                    Installment #{i.installmentNumber}
                  </div>
                  <InstallmentBadge status={i.status} />
                </div>
                <div className="text-2xs text-text-dim mt-0.5">
                  Due {due.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  {i.paidAt && (
                    <>
                      {" "}
                      · paid{" "}
                      {new Date(i.paidAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </>
                  )}
                  {daysOverdue > 0 && (
                    <span className="text-danger ml-2">· {daysOverdue}d overdue</span>
                  )}
                </div>
                {Number(i.lateFee) > 0 && (
                  <div className="text-2xs text-danger mt-0.5">
                    Late fee: ₹{Number(i.lateFee).toLocaleString("en-IN")}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="font-mono text-sm">{money(i.amount)}</div>
                {i.status !== "PAID" && i.status !== "WAIVED" && owed > 0 && (
                  <div className="text-2xs text-text-dim">{money(owed)} owed</div>
                )}
                {canPay && i.status !== "PAID" && owed > 0 && (
                  <PayOnlineButton
                    studentFeeId={studentFeeId}
                    installmentId={i.id}
                    amount={owed}
                    onPaid={onPaid}
                  />
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function PayOnlineButton({
  studentFeeId,
  installmentId,
  amount,
  onPaid,
}: {
  studentFeeId: string;
  installmentId: string;
  amount: number;
  onPaid: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function pay() {
    setLoading(true);
    try {
      const orderRes = await api.post("/api/v1/payments/razorpay/order", {
        studentFeeId,
        installmentId,
        amount,
      });
      const order = orderRes.data.data;
      // When Razorpay is stubbed, verify immediately with mock signature
      if (order.stub) {
        await api.post("/api/v1/payments/razorpay/verify", {
          razorpayOrderId: order.orderId,
          razorpayPaymentId: `pay_stub_${Date.now()}`,
          razorpaySignature: "stub-signature",
        });
        onPaid();
        return;
      }
      // TODO: real Razorpay checkout UI (window.Razorpay) — needs test keys + script loaded
      alert("Razorpay checkout requires real test keys. Install and load the checkout script in production.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="sm" variant="secondary" loading={loading} onClick={pay} className="mt-1">
      Pay now
    </Button>
  );
}

function timelineMarker(status: string): { bg: string; fg: string; Icon: typeof Check } {
  if (status === "PAID") return { bg: "#BBF7D0", fg: "#059669", Icon: Check };
  if (status === "OVERDUE") return { bg: "#FEE2E2", fg: "#DC2626", Icon: AlertCircle };
  if (status === "DUE") return { bg: "#FEF3C7", fg: "#D97706", Icon: Clock };
  if (status === "PARTIALLY_PAID") return { bg: "#DBEAFE", fg: "#2563EB", Icon: IndianRupee };
  return { bg: "#E5E7EB", fg: "#6B7280", Icon: Clock };
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "warning" | "muted";
}) {
  const color =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : tone === "muted"
          ? "text-text-muted"
          : "text-text-primary";
  return (
    <div className="rounded-md bg-white/60 px-3 py-2">
      <div className="text-2xs uppercase tracking-wider text-text-dim">{label}</div>
      <div className={`text-lg font-semibold ${color}`}>{value}</div>
    </div>
  );
}

function FeeStatusBadge({ status }: { status: string }) {
  const tone: "success" | "info" | "warning" | "danger" | "neutral" =
    status === "PAID"
      ? "success"
      : status === "PARTIALLY_PAID"
        ? "info"
        : status === "OVERDUE"
          ? "danger"
          : status === "WAIVED"
            ? "neutral"
            : "warning";
  return <Badge tone={tone}>{status.replace("_", " ").toLowerCase()}</Badge>;
}

function InstallmentBadge({ status }: { status: string }) {
  const tone: "success" | "info" | "warning" | "danger" | "neutral" =
    status === "PAID"
      ? "success"
      : status === "PARTIALLY_PAID"
        ? "info"
        : status === "OVERDUE"
          ? "danger"
          : status === "DUE"
            ? "warning"
            : "neutral";
  return <Badge tone={tone}>{status.replace("_", " ").toLowerCase()}</Badge>;
}

function money(n: string | number): string {
  const v = typeof n === "string" ? Number(n) : n;
  if (Number.isNaN(v)) return "—";
  return `₹${new Intl.NumberFormat("en-IN").format(v)}`;
}
