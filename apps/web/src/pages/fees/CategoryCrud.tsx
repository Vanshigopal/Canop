import { Badge, Button, Input } from "@/components/primitives";
import { api } from "@/lib/api";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface FeeCategory {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export function CategoryCrud() {
  const [cats, setCats] = useState<FeeCategory[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", description: "" });
  const [creating, setCreating] = useState(false);
  const [newDraft, setNewDraft] = useState({ name: "", description: "" });

  const load = useCallback(async () => {
    const r = await api.get("/api/v1/fee-categories");
    setCats(r.data.data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(id: string) {
    await api.patch(`/api/v1/fee-categories/${id}`, draft);
    setEditing(null);
    await load();
  }
  async function create() {
    if (!newDraft.name.trim()) return;
    await api.post("/api/v1/fee-categories", newDraft);
    setCreating(false);
    setNewDraft({ name: "", description: "" });
    await load();
  }
  async function remove(id: string) {
    if (!confirm("Delete this fee category?")) return;
    await api.delete(`/api/v1/fee-categories/${id}`);
    await load();
  }
  async function toggle(c: FeeCategory) {
    await api.patch(`/api/v1/fee-categories/${c.id}`, { isActive: !c.isActive });
    await load();
  }

  return (
    <div className="glass-panel overflow-hidden">
      <div className="px-4 py-3 border-b border-border-soft flex items-center justify-between">
        <div className="font-display text-sm">Fee categories</div>
        {!creating && (
          <Button size="sm" variant="secondary" leftIcon={<Plus size={12} />} onClick={() => setCreating(true)}>
            New category
          </Button>
        )}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-soft text-left text-text-dim">
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Description</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium w-32">Actions</th>
          </tr>
        </thead>
        <tbody>
          {creating && (
            <tr className="border-b border-border-soft bg-indigo/5">
              <td className="px-4 py-2">
                <Input
                  autoFocus
                  placeholder="Category name"
                  value={newDraft.name}
                  onChange={(e) => setNewDraft({ ...newDraft, name: e.target.value })}
                />
              </td>
              <td className="px-4 py-2" colSpan={2}>
                <Input
                  placeholder="Description (optional)"
                  value={newDraft.description}
                  onChange={(e) => setNewDraft({ ...newDraft, description: e.target.value })}
                />
              </td>
              <td className="px-4 py-2">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={create}
                    className="p-1.5 rounded text-success hover:bg-success/10"
                    aria-label="Create"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreating(false);
                      setNewDraft({ name: "", description: "" });
                    }}
                    className="p-1.5 rounded text-text-muted hover:bg-white/60"
                    aria-label="Cancel"
                  >
                    <X size={14} />
                  </button>
                </div>
              </td>
            </tr>
          )}
          {cats.map((c) =>
            editing === c.id ? (
              <tr key={c.id} className="border-b border-border-soft last:border-0 bg-indigo/5">
                <td className="px-4 py-2">
                  <Input
                    autoFocus
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  />
                </td>
                <td className="px-4 py-2" colSpan={2}>
                  <Input
                    value={draft.description}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  />
                </td>
                <td className="px-4 py-2">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => save(c.id)}
                      className="p-1.5 rounded text-success hover:bg-success/10"
                      aria-label="Save"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="p-1.5 rounded text-text-muted hover:bg-white/60"
                      aria-label="Cancel"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              <tr key={c.id} className="border-b border-border-soft last:border-0 hover:bg-white/40">
                <td className="px-4 py-3 font-medium text-text-primary">{c.name}</td>
                <td className="px-4 py-3 text-text-muted" colSpan={2}>
                  {c.description ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggle(c)}
                    aria-label="Toggle active"
                    className="cursor-pointer"
                  >
                    <Badge tone={c.isActive ? "success" : "neutral"}>
                      {c.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(c.id);
                        setDraft({ name: c.name, description: c.description ?? "" });
                      }}
                      className="p-1.5 rounded text-text-muted hover:bg-white/60"
                      aria-label="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(c.id)}
                      className="p-1.5 rounded text-danger hover:bg-danger/10"
                      aria-label="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ),
          )}
          {cats.length === 0 && !creating && (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-text-dim">
                No categories yet. Click &quot;New category&quot; to add one.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
