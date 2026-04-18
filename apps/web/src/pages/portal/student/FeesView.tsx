import { AlertCircle, Check, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRazorpay } from "@/hooks/useRazorpay";
import { formatIndianCurrency } from "@/lib/indian-numbers";
import {
  Empty,
  PortalCard,
  PortalSkeleton,
  PrimaryButton,
  SectionHeader,
  formatRelativeDate,
} from "@/components/portal/PortalPrimitives";
import type { StudentFeeRecord } from "@/components/portal/portal-types";

interface Props {
  fees: StudentFeeRecord[];
  loading: boolean;
  studentName: string;
  userEmail: string | null;
  userPhone: string | null;
  onRefresh: () => void;
}

type InstallmentWithFee = StudentFeeRecord["installments"][number] & {
  fee: StudentFeeRecord;
};

function normalizeAmount(n: number | string): number {
  return typeof n === "string" ? Number(n) : n;
}

function statusMeta(status: string) {
  const map: Record<string, { label: string; bg: string; fg: string; Icon: typeof Clock }> = {
    PAID: { label: "Paid", bg: "#DCFCE7", fg: "#14532D", Icon: Check },
    OVERDUE: { label: "Overdue", bg: "#FEE2E2", fg: "#7F1D1D", Icon: AlertCircle },
    DUE: { label: "Due", bg: "#FEF3C7", fg: "#78350F", Icon: Clock },
    UPCOMING: { label: "Upcoming", bg: "#F1EFE8", fg: "#5F5E5A", Icon: Clock },
    PARTIALLY_PAID: { label: "Part paid", bg: "#DBEAFE", fg: "#1E3A8A", Icon: Clock },
  };
  return map[status] ?? map.UPCOMING!;
}

export function FeesView({
  fees,
  loading,
  studentName,
  userEmail,
  userPhone,
  onRefresh,
}: Props) {
  const { tenant } = useAuth();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const { start: startRazorpay, processing } = useRazorpay();

  const { pending, paid } = useMemo(() => {
    const pending: InstallmentWithFee[] = [];
    const paid: InstallmentWithFee[] = [];
    for (const fee of fees) {
      for (const inst of fee.installments) {
        if (inst.status === "PAID") paid.push({ ...inst, fee });
        else pending.push({ ...inst, fee });
      }
    }
    pending.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    paid.sort((a, b) => b.dueDate.localeCompare(a.dueDate));
    return { pending, paid };
  }, [fees]);

  const totalPending = useMemo(
    () =>
      pending.reduce((sum, i) => {
        const owed =
          normalizeAmount(i.amount) +
          normalizeAmount(i.lateFee) -
          normalizeAmount(i.paidAmount);
        return sum + Math.max(0, owed);
      }, 0),
    [pending],
  );

  if (loading && fees.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <PortalSkeleton height={140} />
        <PortalSkeleton height={80} />
        <PortalSkeleton height={80} />
      </div>
    );
  }

  if (fees.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <SectionHeader title="Fees" />
        <Empty title="No fee plan assigned" body="Your institute will enroll you soon." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader title="Fees" />

      {toast && (
        <div
          className="glass-panel p-3 text-sm font-medium flex items-center gap-2"
          style={{ color: "#14532D", backgroundColor: "#DCFCE7" }}
        >
          <Check size={16} />
          {toast}
        </div>
      )}

      {totalPending > 0 ? (
        <PortalCard accent="amber">
          <p
            className="text-[10px] uppercase tracking-[0.15em]"
            style={{ color: "#78350F", fontWeight: 600 }}
          >
            Total due
          </p>
          <p
            className="text-3xl font-semibold mt-1"
            style={{ color: "#2C2C2A" }}
          >
            {formatIndianCurrency(totalPending)}
          </p>
          <p className="text-xs mt-1" style={{ color: "#78350F" }}>
            {pending.length} installment{pending.length > 1 ? "s" : ""} pending
          </p>
        </PortalCard>
      ) : (
        <PortalCard accent="emerald">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#DCFCE7", color: "#14532D" }}
            >
              <Check size={20} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "#2C2C2A" }}>
                All cleared
              </p>
              <p className="text-xs" style={{ color: "#6B6A66" }}>
                No pending installments
              </p>
            </div>
          </div>
        </PortalCard>
      )}

      {pending.length > 0 && (
        <section>
          <SectionHeader title="Pending" />
          <div className="flex flex-col gap-2">
            {pending.map((i) => {
              const isExpanded = expanded === i.id;
              const s = statusMeta(i.status);
              const owed =
                normalizeAmount(i.amount) +
                normalizeAmount(i.lateFee) -
                normalizeAmount(i.paidAmount);
              return (
                <PortalCard key={i.id} padded={false} className="overflow-hidden">
                  <button
                    type="button"
                    className="w-full p-4 flex items-center gap-3 text-left transition-colors active:bg-black/5"
                    onClick={() => setExpanded(isExpanded ? null : i.id)}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: s.bg, color: s.fg }}
                    >
                      <s.Icon size={18} strokeWidth={2.2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: "#2C2C2A" }}>
                        Installment {i.installmentNumber} · {i.fee.plan.name}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: s.fg }}>
                        {s.label} · Due {formatRelativeDate(i.dueDate)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold" style={{ color: "#2C2C2A" }}>
                        {formatIndianCurrency(Math.max(0, owed))}
                      </p>
                      {isExpanded ? (
                        <ChevronUp size={14} color="#6B6A66" className="ml-auto mt-0.5" />
                      ) : (
                        <ChevronDown size={14} color="#6B6A66" className="ml-auto mt-0.5" />
                      )}
                    </div>
                  </button>
                  {isExpanded && (
                    <div
                      className="px-4 pb-4 pt-2 border-t flex flex-col gap-3"
                      style={{ borderColor: "rgba(90, 70, 50, 0.08)" }}
                    >
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <Detail
                          label="Amount"
                          value={formatIndianCurrency(normalizeAmount(i.amount))}
                        />
                        <Detail
                          label="Late fee"
                          value={formatIndianCurrency(normalizeAmount(i.lateFee))}
                        />
                        <Detail
                          label="Paid"
                          value={formatIndianCurrency(normalizeAmount(i.paidAmount))}
                        />
                        <Detail
                          label="Due"
                          value={new Date(i.dueDate).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        />
                      </div>
                      <PrimaryButton
                        disabled={processing || owed <= 0}
                        fullWidth
                        onClick={() =>
                          startRazorpay({
                            studentFeeId: i.fee.id,
                            installmentId: i.id,
                            amount: Math.max(0, owed),
                            name: studentName,
                            email: userEmail,
                            phone: userPhone,
                            tenantName: tenant?.name,
                            onSuccess: ({ receiptNumber }) => {
                              setToast(
                                receiptNumber
                                  ? `Paid — Receipt ${receiptNumber}`
                                  : "Payment successful",
                              );
                              onRefresh();
                              setExpanded(null);
                              setTimeout(() => setToast(null), 4000);
                            },
                            onError: (msg) => {
                              setToast(`Payment failed: ${msg}`);
                              setTimeout(() => setToast(null), 5000);
                            },
                          })
                        }
                      >
                        {processing ? "Processing…" : "Pay now"}
                      </PrimaryButton>
                    </div>
                  )}
                </PortalCard>
              );
            })}
          </div>
        </section>
      )}

      {paid.length > 0 && (
        <section>
          <SectionHeader title="Paid" />
          <div className="flex flex-col gap-2">
            {paid.map((i) => {
              const payment = i.fee.payments.find((p) => p.status === "SUCCESS");
              return (
                <PortalCard key={i.id} padded={false} className="p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: "#DCFCE7", color: "#14532D" }}
                    >
                      <Check size={18} strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: "#2C2C2A" }}>
                        Installment {i.installmentNumber}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "#6B6A66" }}>
                        {payment?.receiptNumber
                          ? `Receipt ${payment.receiptNumber}`
                          : i.paidAt
                            ? `Paid ${formatRelativeDate(i.paidAt)}`
                            : "Paid"}
                      </p>
                    </div>
                    <p className="text-sm font-semibold" style={{ color: "#2C2C2A" }}>
                      {formatIndianCurrency(normalizeAmount(i.amount))}
                    </p>
                  </div>
                </PortalCard>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider" style={{ color: "#6B6A66" }}>
        {label}
      </p>
      <p className="text-sm font-medium" style={{ color: "#2C2C2A" }}>
        {value}
      </p>
    </div>
  );
}
