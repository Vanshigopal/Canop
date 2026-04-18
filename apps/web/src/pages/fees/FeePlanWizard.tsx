import { Button, Input } from "@/components/primitives";
import { api } from "@/lib/api";
import { formatIndianCurrency } from "@/lib/indian-numbers";
import { ArrowLeft, ArrowRight, Check, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface Category {
  id: string;
  name: string;
  isActive: boolean;
}
interface Batch {
  id: string;
  name: string;
  academicYear: string;
}

interface ItemDraft {
  categoryId: string;
  amount: string;
}

export function FeePlanWizard({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    batchId: "",
    name: "",
    academicYear: "2025-2026",
    totalAmount: "",
    installmentCount: "1",
    installmentFrequency: "MONTHLY",
    dueDay: "1",
    lateFeeAmount: "",
    gracePeriodDays: "7",
  });
  const [items, setItems] = useState<ItemDraft[]>([{ categoryId: "", amount: "" }]);

  useEffect(() => {
    api.get("/api/v1/fee-categories").then((r) => setCategories(r.data.data.filter((c: Category) => c.isActive)));
    api.get("/api/v1/batches").then((r) => setBatches(r.data.data));
  }, []);

  const itemsSum = useMemo(
    () => items.reduce((s, i) => s + (Number(i.amount) || 0), 0),
    [items],
  );
  const totalAmount = Number(form.totalAmount) || 0;
  const sumMatches = Math.abs(itemsSum - totalAmount) < 0.01;

  function updateItem(i: number, patch: Partial<ItemDraft>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, { categoryId: "", amount: "" }]);
  }
  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function submit() {
    setError("");
    setSubmitting(true);
    try {
      await api.post("/api/v1/fee-plans", {
        batchId: form.batchId,
        name: form.name,
        academicYear: form.academicYear,
        totalAmount,
        installmentCount: Number(form.installmentCount),
        installmentFrequency: form.installmentFrequency,
        dueDay: Number(form.dueDay),
        lateFeeAmount: form.lateFeeAmount ? Number(form.lateFeeAmount) : null,
        gracePeriodDays: Number(form.gracePeriodDays),
        items: items
          .filter((i) => i.categoryId && Number(i.amount) > 0)
          .map((i) => ({ categoryId: i.categoryId, amount: Number(i.amount) })),
      });
      onSuccess();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { title?: string } } };
      setError(err?.response?.data?.title ?? "Failed to create plan");
    } finally {
      setSubmitting(false);
    }
  }

  const canStep1 = !!form.batchId && !!form.name && totalAmount > 0 && /^\d{4}-\d{4}$/.test(form.academicYear);
  const canStep2 =
    sumMatches &&
    items.every((i) => i.categoryId && Number(i.amount) > 0) &&
    new Set(items.map((i) => i.categoryId)).size === items.length;
  const canStep3 = Number(form.installmentCount) >= 1 && Number(form.dueDay) >= 1;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm p-4">
      <div className="glass-panel p-6 w-full max-w-xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="font-display text-lg">Create fee plan</div>
            <div className="text-2xs text-text-dim">Step {step} of 4</div>
          </div>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-5">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-indigo" : "bg-border-soft"
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <div>
              <label className="block text-2xs uppercase tracking-wider text-text-dim mb-1.5">
                Batch
              </label>
              <select
                value={form.batchId}
                onChange={(e) => {
                  const b = batches.find((bt) => bt.id === e.target.value);
                  setForm({
                    ...form,
                    batchId: e.target.value,
                    academicYear: b?.academicYear ?? form.academicYear,
                  });
                }}
                className="w-full rounded-md border border-border-soft bg-white/92 px-3 py-2 text-sm"
              >
                <option value="">Choose a batch</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} · {b.academicYear}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Plan name"
              placeholder="NEET-2026 Annual Fee"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Academic year"
                placeholder="2025-2026"
                value={form.academicYear}
                onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
                hint="Format: YYYY-YYYY"
              />
              <Input
                label="Total amount"
                type="number"
                placeholder="75000"
                value={form.totalAmount}
                onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="text-2xs uppercase tracking-wider text-text-dim mb-2">
              Break down by category · total must equal ₹{totalAmount.toLocaleString("en-IN")}
            </div>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <select
                    value={it.categoryId}
                    onChange={(e) => updateItem(i, { categoryId: e.target.value })}
                    className="flex-1 rounded-md border border-border-soft bg-white/92 px-3 py-2 text-sm"
                  >
                    <option value="">Select category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="₹"
                    value={it.amount}
                    onChange={(e) => updateItem(i, { amount: e.target.value })}
                    className="w-32 rounded-md border border-border-soft bg-white/92 px-3 py-2 text-sm"
                  />
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      className="p-2 text-danger hover:bg-danger/10 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addItem}
              className="mt-2 inline-flex items-center gap-1 text-xs text-indigo hover:underline"
            >
              <Plus size={12} /> Add category
            </button>
            <div
              className={`mt-3 text-xs ${
                sumMatches ? "text-success" : "text-danger"
              } flex items-center justify-between rounded-md bg-white/60 px-3 py-2`}
            >
              <span>
                Sum: ₹{itemsSum.toLocaleString("en-IN")} / ₹{totalAmount.toLocaleString("en-IN")}
              </span>
              {sumMatches && <Check size={14} />}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-2xs uppercase tracking-wider text-text-dim mb-1.5">
                  Frequency
                </label>
                <select
                  value={form.installmentFrequency}
                  onChange={(e) => setForm({ ...form, installmentFrequency: e.target.value })}
                  className="w-full rounded-md border border-border-soft bg-white/92 px-3 py-2 text-sm"
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="HALF_YEARLY">Half yearly</option>
                  <option value="ANNUALLY">Annually</option>
                </select>
              </div>
              <Input
                label="# of installments"
                type="number"
                value={form.installmentCount}
                onChange={(e) => setForm({ ...form, installmentCount: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Due day"
                type="number"
                min={1}
                max={28}
                value={form.dueDay}
                onChange={(e) => setForm({ ...form, dueDay: e.target.value })}
                hint="1–28"
              />
              <Input
                label="Late fee ₹"
                type="number"
                placeholder="500"
                value={form.lateFeeAmount}
                onChange={(e) => setForm({ ...form, lateFeeAmount: e.target.value })}
              />
              <Input
                label="Grace days"
                type="number"
                value={form.gracePeriodDays}
                onChange={(e) => setForm({ ...form, gracePeriodDays: e.target.value })}
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <div className="text-2xs uppercase tracking-wider text-text-dim mb-2">Review</div>
            <div className="space-y-3 text-sm">
              <Row k="Plan" v={form.name} />
              <Row
                k="Batch"
                v={batches.find((b) => b.id === form.batchId)?.name ?? "—"}
              />
              <Row k="Academic year" v={form.academicYear} />
              <Row k="Total" v={formatIndianCurrency(totalAmount)} />
              <Row
                k="Installments"
                v={`${form.installmentCount} · ${form.installmentFrequency.toLowerCase()}`}
              />
              <Row k="Due day" v={`Day ${form.dueDay} of each cycle`} />
              {form.lateFeeAmount && (
                <Row
                  k="Late fee"
                  v={`${formatIndianCurrency(Number(form.lateFeeAmount))} after ${form.gracePeriodDays} day grace`}
                />
              )}
              <div>
                <div className="text-2xs uppercase tracking-wider text-text-dim mb-1">Breakdown</div>
                <div className="rounded-md bg-white/60 p-2 text-xs">
                  {items.map((it, i) => {
                    const cat = categories.find((c) => c.id === it.categoryId);
                    return (
                      <div key={i} className="flex justify-between py-0.5">
                        <span>{cat?.name ?? "—"}</span>
                        <span className="font-mono">
                          ₹{Number(it.amount).toLocaleString("en-IN")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            {error && (
              <div className="mt-3 rounded-md bg-danger/10 border border-danger/20 px-3 py-2 text-xs text-danger">
                {error}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 justify-between mt-5">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<ArrowLeft size={12} />}
            disabled={step === 1}
            onClick={() => setStep((s) => s - 1)}
          >
            Back
          </Button>
          {step < 4 && (
            <Button
              size="sm"
              rightIcon={<ArrowRight size={12} />}
              disabled={(step === 1 && !canStep1) || (step === 2 && !canStep2) || (step === 3 && !canStep3)}
              onClick={() => setStep((s) => s + 1)}
            >
              Next
            </Button>
          )}
          {step === 4 && (
            <Button size="sm" loading={submitting} onClick={submit}>
              Create plan
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b border-border-soft last:border-0 py-1">
      <span className="text-text-dim">{k}</span>
      <span className="text-text-primary">{v}</span>
    </div>
  );
}
