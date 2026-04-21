import { Badge, Button, CustomSelect, Input } from "@/components/primitives";
import { api } from "@/lib/api";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { ArrowRight, ChevronDown, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

interface Student {
  id: string;
  rollNumber: string | null;
  enrolledAt: string;
  user: { id: string; name: string; email: string; phone: string | null; isActive: boolean };
  batch: { id: string; name: string } | null;
  class: { id: string; name: string } | null;
  batches: Array<{ batch: { id: string; name: string } }>;
}

interface BatchOption {
  id: string;
  name: string;
}

type Action = "add" | "remove" | "transfer" | null;

export function StudentsPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterBatchId, setFilterBatchId] = useState("");
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [action, setAction] = useState<Action>(null);
  const [toast, setToast] = useState("");

  async function load(q?: string, bId?: string) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("search", q);
      if (bId) params.set("batchId", bId);
      const res = await api.get(`/api/v1/students?${params}`);
      setStudents(res.data.data);
      setTotal(res.data.meta.total);
    } finally {
      setLoading(false);
    }
  }

  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    load(debouncedSearch, filterBatchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filterBatchId]);

  useEffect(() => {
    api.get("/api/v1/batches").then((r) => {
      setBatches(
        r.data.data.map((b: { id: string; name: string }) => ({ id: b.id, name: b.name })),
      );
    });
  }, []);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleSelectAll() {
    if (selected.size === students.length) setSelected(new Set());
    else setSelected(new Set(students.map((s) => s.id)));
  }
  function clearSelection() {
    setSelected(new Set());
    setAction(null);
  }

  const selectedStudents = useMemo(
    () => students.filter((s) => selected.has(s.id)),
    [students, selected],
  );

  const batchesInSelection = useMemo(() => {
    const ids = new Set<string>();
    for (const s of selectedStudents) {
      if (s.batch) ids.add(s.batch.id);
      for (const b of s.batches) ids.add(b.batch.id);
    }
    return batches.filter((b) => ids.has(b.id));
  }, [selectedStudents, batches]);

  async function performAssign(batchId: string) {
    try {
      await api.post("/api/v1/students/batch-assign", {
        studentIds: Array.from(selected),
        batchId,
      });
      const batch = batches.find((b) => b.id === batchId);
      setToast(`${selected.size} student(s) added to ${batch?.name}`);
      clearSelection();
      load(search, filterBatchId);
    } catch (e: unknown) {
      setToast(
        (e as { response?: { data?: { title?: string } } })?.response?.data?.title ||
          "Failed to assign",
      );
    }
  }
  async function performRemove(batchId: string) {
    if (
      !confirm(
        `Remove ${selected.size} student(s) from this batch? This will stop attendance tracking for this batch.`,
      )
    )
      return;
    try {
      await api.post("/api/v1/students/batch-remove", {
        studentIds: Array.from(selected),
        batchId,
      });
      setToast(`${selected.size} student(s) removed`);
      clearSelection();
      load(search, filterBatchId);
    } catch (e: unknown) {
      setToast(
        (e as { response?: { data?: { title?: string } } })?.response?.data?.title ||
          "Failed to remove",
      );
    }
  }
  async function performTransfer(sourceBatchId: string, batchId: string) {
    try {
      await api.post("/api/v1/students/batch-transfer", {
        studentIds: Array.from(selected),
        sourceBatchId,
        batchId,
      });
      const target = batches.find((b) => b.id === batchId);
      setToast(`${selected.size} student(s) moved to ${target?.name}`);
      clearSelection();
      load(search, filterBatchId);
    } catch (e: unknown) {
      setToast(
        (e as { response?: { data?: { title?: string } } })?.response?.data?.title ||
          "Failed to transfer",
      );
    }
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const allChecked = students.length > 0 && selected.size === students.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl tracking-tight">Students</h1>
          <p className="text-text-muted text-sm mt-1">{total} enrolled</p>
        </div>
        <Link
          to="/analytics/engagement"
          className="text-xs font-medium text-indigo hover:underline inline-flex items-center gap-1"
        >
          View Engagement Analytics <ArrowRight size={12} />
        </Link>
      </div>

      <div className="mb-4 flex gap-2 flex-wrap items-center">
        <form
          className="flex gap-2 flex-1 max-w-md"
          onSubmit={(e) => {
            e.preventDefault();
            load(search, filterBatchId);
          }}
        >
          <div className="flex-1">
            <Input
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="px-3 py-2 rounded-md bg-white/80 border border-border-soft hover:bg-white transition-colors"
          >
            <Search size={16} className="text-text-muted" />
          </button>
        </form>
        <div style={{ minWidth: 180 }}>
          <CustomSelect
            value={filterBatchId}
            onChange={setFilterBatchId}
            options={[
              { value: "", label: "All batches" },
              ...batches.map((b) => ({ value: b.id, label: b.name })),
            ]}
          />
        </div>
      </div>

      {selected.size > 0 && (
        <ActionBar
          count={selected.size}
          batches={batches}
          batchesInSelection={batchesInSelection}
          action={action}
          setAction={setAction}
          onAssign={performAssign}
          onRemove={performRemove}
          onTransfer={performTransfer}
          onClear={clearSelection}
        />
      )}

      {toast && (
        <div className="mb-3 rounded-lg bg-success/10 border border-success/20 px-4 py-2 text-xs text-success">
          {toast}
        </div>
      )}

      {loading ? (
        <div className="text-text-dim text-sm">Loading...</div>
      ) : (
        <div className="glass-panel overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-soft text-left text-text-dim">
                <th className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={toggleSelectAll}
                    aria-label="Select all"
                    className="w-4 h-4 rounded border-border-soft cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Class</th>
                <th className="px-4 py-3 font-medium">Batches</th>
                <th className="px-4 py-3 font-medium">Roll No</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const allBatchNames = Array.from(
                  new Set(
                    [s.batch?.name, ...s.batches.map((b) => b.batch.name)].filter(
                      (x): x is string => Boolean(x),
                    ),
                  ),
                );
                const isChecked = selected.has(s.id);
                return (
                  <tr
                    key={s.id}
                    onClick={() => navigate(`/students/${s.id}`)}
                    className={`border-b border-border-soft last:border-0 cursor-pointer transition-colors ${
                      isChecked ? "bg-indigo/5" : "hover:bg-[#FAF7F2]"
                    }`}
                  >
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelect(s.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Select ${s.user.name}`}
                        className="w-4 h-4 rounded border-border-soft cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-text-primary">
                      {s.user.name}
                    </td>
                    <td className="px-4 py-3 text-text-muted font-mono text-xs">{s.user.phone}</td>
                    <td className="px-4 py-3 text-text-muted">{s.class?.name || "—"}</td>
                    <td className="px-4 py-3 text-text-muted">
                      {allBatchNames.length === 0 ? (
                        "—"
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {allBatchNames.map((name) => (
                            <span
                              key={name}
                              className="text-2xs px-1.5 py-0.5 rounded bg-pastel-sky/50 text-text-muted"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-muted font-mono text-xs">
                      {s.rollNumber || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={s.user.isActive ? "success" : "neutral"}>
                        {s.user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
              {students.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-text-dim">
                    No students enrolled yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface ActionBarProps {
  count: number;
  batches: BatchOption[];
  batchesInSelection: BatchOption[];
  action: Action;
  setAction: (a: Action) => void;
  onAssign: (batchId: string) => void;
  onRemove: (batchId: string) => void;
  onTransfer: (sourceBatchId: string, batchId: string) => void;
  onClear: () => void;
}

function ActionBar({
  count,
  batches,
  batchesInSelection,
  action,
  setAction,
  onAssign,
  onRemove,
  onTransfer,
  onClear,
}: ActionBarProps) {
  const [pickedSource, setPickedSource] = useState("");

  return (
    <div
      className="glass-panel p-3 mb-3 flex items-center gap-3 flex-wrap"
      style={{ overflow: "visible", position: "relative", zIndex: 40 }}
    >
      <Badge tone="info">{count} selected</Badge>

      <div className="relative">
        <Button
          variant="secondary"
          size="sm"
          rightIcon={<ChevronDown size={14} />}
          onClick={() => setAction(action === "add" ? null : "add")}
        >
          Add to batch
        </Button>
        {action === "add" && (
          <Dropdown
            items={batches}
            onPick={(b) => {
              onAssign(b.id);
              setAction(null);
            }}
          />
        )}
      </div>

      <div className="relative">
        <Button
          variant="secondary"
          size="sm"
          rightIcon={<ChevronDown size={14} />}
          disabled={batchesInSelection.length === 0}
          onClick={() => setAction(action === "remove" ? null : "remove")}
        >
          Remove from batch
        </Button>
        {action === "remove" && (
          <Dropdown
            items={batchesInSelection}
            onPick={(b) => {
              onRemove(b.id);
              setAction(null);
            }}
          />
        )}
      </div>

      <div className="relative">
        <Button
          variant="secondary"
          size="sm"
          rightIcon={<ChevronDown size={14} />}
          disabled={batchesInSelection.length === 0}
          onClick={() => setAction(action === "transfer" ? null : "transfer")}
        >
          Change batch
        </Button>
        {action === "transfer" && !pickedSource && (
          <Dropdown
            items={batchesInSelection}
            label="From"
            onPick={(b) => setPickedSource(b.id)}
          />
        )}
        {action === "transfer" && pickedSource && (
          <Dropdown
            items={batches.filter((b) => b.id !== pickedSource)}
            label="To"
            onPick={(b) => {
              onTransfer(pickedSource, b.id);
              setPickedSource("");
              setAction(null);
            }}
          />
        )}
      </div>

      <button
        type="button"
        onClick={onClear}
        className="ml-auto text-xs text-text-muted hover:text-text-primary inline-flex items-center gap-1"
      >
        <X size={12} /> Clear selection
      </button>
    </div>
  );
}

function Dropdown({
  items,
  label,
  onPick,
}: {
  items: BatchOption[];
  label?: string;
  onPick: (b: BatchOption) => void;
}) {
  return (
    <div
      className="absolute left-0 top-full mt-1 w-56 glass-panel p-1 shadow-lg"
      style={{ animation: "scaleIn 0.12s ease-out", zIndex: 50 }}
    >
      {label && (
        <div className="px-2 py-1 text-2xs uppercase tracking-wider text-text-dim">{label}</div>
      )}
      {items.length === 0 && (
        <div className="px-3 py-2 text-xs text-text-dim">No batches available</div>
      )}
      {items.map((b) => (
        <button
          key={b.id}
          type="button"
          className="block w-full text-left px-3 py-1.5 text-sm rounded hover:bg-white/60 text-text-primary"
          onClick={() => onPick(b)}
        >
          {b.name}
        </button>
      ))}
    </div>
  );
}
