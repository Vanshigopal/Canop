import { Badge, Button, Input } from "@/components/primitives";
import { api } from "@/lib/api";
import { useSocket } from "@/hooks/useSocket";
import { Check, Printer, Receipt } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

interface StudentLite {
  id: string;
  rollNumber: string | null;
  user: { id: string; name: string; email: string; phone: string | null };
  batch: { id: string; name: string } | null;
}

interface StudentFeeDetail {
  id: string;
  totalAmount: string;
  paidAmount: string;
  pendingAmount: string;
  status: string;
  plan: { id: string; name: string; academicYear: string };
  installments: Array<{
    id: string;
    installmentNumber: number;
    amount: string;
    paidAmount: string;
    lateFee: string;
    dueDate: string;
    status: string;
  }>;
}

interface Payment {
  id: string;
  amount: string;
  method: string;
  status: string;
  receiptNumber: string | null;
  transactionRef: string | null;
  paidAt: string | null;
  createdAt: string;
  studentFee: {
    student: {
      id: string;
      rollNumber: string | null;
      user: { id: string; name: string };
      batch: { id: string; name: string } | null;
    };
    plan: { id: string; name: string };
  };
  collectedBy: { id: string; name: string } | null;
}

interface Receipt {
  receiptNumber: string;
  issuedAt: string;
  institute: { name: string | null; slug: string | null; tagline: string | null };
  student: {
    name: string;
    rollNumber: string | null;
    batch: string | null;
    email: string;
    phone: string | null;
  };
  plan: { id: string; name: string; academicYear: string };
  installment: { number: number; amount: number; dueDate: string } | null;
  payment: {
    amount: number;
    method: string;
    transactionRef: string | null;
    status: string;
    note: string | null;
  };
  collectedBy: string | null;
}

export function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activeReceipt, setActiveReceipt] = useState<Receipt | null>(null);
  const [toast, setToast] = useState("");

  const loadPayments = useCallback(async () => {
    const r = await api.get("/api/v1/payments?pageSize=50");
    setPayments(r.data.data);
  }, []);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  useSocket("payment:received", () => {
    loadPayments();
  });

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  async function showReceipt(paymentId: string) {
    const r = await api.get(`/api/v1/payments/${paymentId}/receipt`);
    setActiveReceipt(r.data.data);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl tracking-tight">Payments</h1>
        <p className="text-text-muted text-sm mt-1">
          Record cash/offline payments and view transaction history.
        </p>
      </div>

      {toast && (
        <div className="mb-3 rounded-lg bg-success/10 border border-success/20 px-4 py-2 text-xs text-success">
          {toast}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2">
          <RecordPaymentForm
            onRecorded={(rcpt) => {
              loadPayments();
              if (rcpt) setActiveReceipt(rcpt);
              setToast("Payment recorded");
            }}
          />
        </div>
        <div className="lg:col-span-3">
          <div className="glass-panel overflow-hidden">
            <div className="px-4 py-3 border-b border-border-soft font-display text-sm">
              Transaction history
            </div>
            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white/95">
                  <tr className="border-b border-border-soft text-left text-text-dim">
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Student</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Method</th>
                    <th className="px-4 py-3 font-medium">Receipt</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium w-14"></th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-border-soft last:border-0 hover:bg-white/40"
                    >
                      <td className="px-4 py-3 text-2xs text-text-muted">
                        {new Date(p.paidAt ?? p.createdAt).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{p.studentFee.student.user.name}</div>
                        <div className="text-2xs text-text-dim">
                          {p.studentFee.student.batch?.name ?? "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold">{money(p.amount)}</td>
                      <td className="px-4 py-3">
                        <Badge tone="info">{p.method.replace("_", " ").toLowerCase()}</Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-2xs text-text-muted">
                        {p.receiptNumber ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <PaymentStatusBadge status={p.status} />
                      </td>
                      <td className="px-4 py-3">
                        {p.status === "SUCCESS" && (
                          <button
                            type="button"
                            onClick={() => showReceipt(p.id)}
                            className="p-1.5 rounded hover:bg-white/60 text-text-muted hover:text-text-primary"
                            aria-label="View receipt"
                          >
                            <Receipt size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {payments.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-text-dim">
                        No payments recorded yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {activeReceipt && (
        <ReceiptModal receipt={activeReceipt} onClose={() => setActiveReceipt(null)} />
      )}
    </div>
  );
}

function RecordPaymentForm({ onRecorded }: { onRecorded: (receipt: Receipt | null) => void }) {
  const [students, setStudents] = useState<StudentLite[]>([]);
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<StudentLite | null>(null);
  const [fees, setFees] = useState<StudentFeeDetail[]>([]);
  const [instId, setInstId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<
    "CASH" | "UPI" | "CARD" | "NETBANKING" | "CHEQUE" | "BANK_TRANSFER" | "OTHER"
  >("CASH");
  const [transactionRef, setTransactionRef] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const filteredStudents = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return students.filter((s) => s.user.name.toLowerCase().includes(q)).slice(0, 8);
  }, [students, search]);

  useEffect(() => {
    api.get("/api/v1/students?pageSize=200").then((r) => setStudents(r.data.data));
  }, []);

  useEffect(() => {
    if (!picked) {
      setFees([]);
      return;
    }
    api.get(`/api/v1/student-fees/${picked.id}`).then((r) => setFees(r.data.data));
  }, [picked]);

  const openInstallment = useMemo(() => {
    for (const f of fees) {
      const found = f.installments.find(
        (i) => i.status !== "PAID" && i.status !== "WAIVED" && i.status !== "PARTIALLY_PAID",
      );
      if (found) return { fee: f, installment: found };
    }
    for (const f of fees) {
      const found = f.installments.find((i) => i.status === "PARTIALLY_PAID");
      if (found) return { fee: f, installment: found };
    }
    return null;
  }, [fees]);

  useEffect(() => {
    if (instId) {
      for (const f of fees) {
        const inst = f.installments.find((i) => i.id === instId);
        if (inst) {
          const owed = Number(inst.amount) + Number(inst.lateFee) - Number(inst.paidAmount);
          setAmount(String(owed));
          return;
        }
      }
    } else if (openInstallment) {
      const o = openInstallment.installment;
      const owed = Number(o.amount) + Number(o.lateFee) - Number(o.paidAmount);
      setAmount(String(owed));
      setInstId(o.id);
    }
  }, [instId, fees, openInstallment]);

  const studentFeeId =
    fees.find((f) => f.installments.some((i) => i.id === instId))?.id ?? fees[0]?.id;

  async function submit() {
    setError("");
    if (!studentFeeId || !amount || Number(amount) <= 0) {
      setError("Pick a student + installment and enter amount");
      return;
    }
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        studentFeeId,
        amount: Number(amount),
        method,
      };
      if (instId) body.installmentId = instId;
      if (transactionRef) body.transactionRef = transactionRef;
      if (note) body.note = note;
      const res = await api.post("/api/v1/payments/record", body);
      const paymentId = res.data.data.id;
      const rcpt = await api.get(`/api/v1/payments/${paymentId}/receipt`);
      onRecorded(rcpt.data.data as Receipt);
      // reset
      setAmount("");
      setInstId("");
      setTransactionRef("");
      setNote("");
      setPicked(null);
      setSearch("");
    } catch (e: unknown) {
      const err = e as { response?: { data?: { title?: string } } };
      setError(err?.response?.data?.title ?? "Failed to record");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass-panel p-5">
      <div className="font-display text-sm mb-3">Record payment</div>

      {!picked && (
        <div>
          <div className="relative">
            <Input
              placeholder="Search student by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {filteredStudents.length > 0 && (
            <div className="mt-2 rounded-md border border-border-soft divide-y divide-border-soft max-h-48 overflow-auto">
              {filteredStudents.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => {
                    setPicked(s);
                    setSearch("");
                  }}
                  className="block w-full text-left px-3 py-2 hover:bg-white/60 text-sm"
                >
                  <span className="font-medium">{s.user.name}</span>
                  <span className="text-2xs text-text-dim ml-2">
                    {s.batch?.name ?? "—"} · {s.rollNumber ?? "—"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {picked && (
        <>
          <div className="flex items-center justify-between mb-3 rounded-md bg-indigo/5 border border-indigo/15 px-3 py-2">
            <div>
              <div className="font-medium text-sm">{picked.user.name}</div>
              <div className="text-2xs text-text-dim">
                {picked.batch?.name ?? "—"} · {picked.rollNumber ?? "no roll"}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setPicked(null);
                setInstId("");
                setAmount("");
              }}
              className="text-2xs text-text-muted hover:text-text-primary"
            >
              Change
            </button>
          </div>

          {fees.length === 0 ? (
            <div className="text-xs text-text-dim py-3 text-center">
              No fee plans assigned to this student.
            </div>
          ) : (
            <>
              <label className="block text-2xs uppercase tracking-wider text-text-dim mb-1.5">
                Installment
              </label>
              <select
                value={instId}
                onChange={(e) => setInstId(e.target.value)}
                className="w-full rounded-md border border-border-soft bg-white/92 px-3 py-2 text-sm mb-3"
              >
                <option value="">Pick an installment</option>
                {fees.map((f) =>
                  f.installments.map((i) => {
                    const owed = Number(i.amount) + Number(i.lateFee) - Number(i.paidAmount);
                    return (
                      <option key={i.id} value={i.id} disabled={i.status === "PAID"}>
                        {f.plan.name} · #{i.installmentNumber} · {money(owed)} owed ·{" "}
                        {i.status.toLowerCase()}
                      </option>
                    );
                  }),
                )}
              </select>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <Input
                  label="Amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <div>
                  <label className="block text-2xs uppercase tracking-wider text-text-dim mb-1.5">
                    Method
                  </label>
                  <select
                    value={method}
                    onChange={(e) =>
                      setMethod(e.target.value as typeof method)
                    }
                    className="w-full rounded-md border border-border-soft bg-white/92 px-3 py-2 text-sm"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="CARD">Card</option>
                    <option value="NETBANKING">Net banking</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="BANK_TRANSFER">Bank transfer</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>
              <Input
                label="Transaction ref (optional)"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
              />
              <Input
                label="Note (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-3"
              />

              {error && (
                <div className="mt-3 rounded-md bg-danger/10 border border-danger/20 px-3 py-2 text-xs text-danger">
                  {error}
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <Button
                  size="sm"
                  loading={loading}
                  leftIcon={<Check size={12} />}
                  onClick={submit}
                >
                  Record payment
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function ReceiptModal({ receipt, onClose }: { receipt: Receipt; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm p-4">
      <div className="glass-panel p-6 w-full max-w-md print:shadow-none print:border-0">
        <div className="flex items-start justify-between mb-3 print:hidden">
          <div className="font-display text-lg">Receipt</div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => window.print()}
              className="p-1.5 rounded text-text-muted hover:bg-white/60"
              aria-label="Print"
            >
              <Printer size={16} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded text-text-muted hover:bg-white/60"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>
        <div>
          <div className="text-center mb-4 pb-3 border-b border-border-soft">
            <div className="font-display text-lg">{receipt.institute.name}</div>
            <div className="text-2xs text-text-dim">{receipt.institute.tagline ?? ""}</div>
          </div>
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <div className="text-2xs uppercase tracking-wider text-text-dim">Receipt no.</div>
              <div className="font-mono text-sm">{receipt.receiptNumber}</div>
            </div>
            <div className="text-right">
              <div className="text-2xs uppercase tracking-wider text-text-dim">Date</div>
              <div className="text-sm">
                {new Date(receipt.issuedAt).toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </div>
            </div>
          </div>
          <div className="space-y-1 text-sm mb-3">
            <ReceiptRow k="Student" v={receipt.student.name} />
            <ReceiptRow k="Batch" v={receipt.student.batch ?? "—"} />
            <ReceiptRow k="Plan" v={`${receipt.plan.name} (${receipt.plan.academicYear})`} />
            {receipt.installment && (
              <ReceiptRow
                k="Installment"
                v={`#${receipt.installment.number} · ₹${receipt.installment.amount.toLocaleString("en-IN")}`}
              />
            )}
            <ReceiptRow k="Method" v={receipt.payment.method.replace("_", " ").toLowerCase()} />
            {receipt.payment.transactionRef && (
              <ReceiptRow k="Ref." v={receipt.payment.transactionRef} />
            )}
            {receipt.collectedBy && <ReceiptRow k="Collected by" v={receipt.collectedBy} />}
          </div>
          <div className="mt-4 pt-3 border-t border-border-soft flex items-baseline justify-between">
            <div className="text-2xs uppercase tracking-wider text-text-dim">Amount paid</div>
            <div className="font-display text-xl text-success">
              ₹{receipt.payment.amount.toLocaleString("en-IN")}
            </div>
          </div>
          {receipt.payment.note && (
            <div className="mt-3 text-2xs text-text-dim">Note: {receipt.payment.note}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReceiptRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-text-dim text-xs">{k}</span>
      <span className="text-text-primary capitalize">{v}</span>
    </div>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  const tone: "success" | "warning" | "danger" | "neutral" =
    status === "SUCCESS"
      ? "success"
      : status === "PENDING"
        ? "warning"
        : status === "FAILED"
          ? "danger"
          : "neutral";
  return <Badge tone={tone}>{status.toLowerCase()}</Badge>;
}

function money(n: string | number): string {
  const v = typeof n === "string" ? Number(n) : n;
  if (Number.isNaN(v)) return "—";
  return `₹${new Intl.NumberFormat("en-IN").format(v)}`;
}
