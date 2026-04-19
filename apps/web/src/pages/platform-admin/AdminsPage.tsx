import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { platformApi } from "@/stores/platform-auth";
import {
  Badge,
  Card,
  PageHeader,
  formatRelativeDate,
} from "./shared";
import { usePlatformAuth } from "@/stores/platform-auth";

const ROLE_TONES: Record<string, "slate" | "blue" | "violet" | "green"> = {
  SUPER_ADMIN: "violet",
  PLATFORM_SUPPORT: "blue",
  PLATFORM_BILLING: "green",
};

export function AdminsPage() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const me = usePlatformAuth((s) => s.admin);

  const { data: admins } = useQuery({
    queryKey: ["platform", "admins"],
    queryFn: async () => (await platformApi.get("/api/v1/platform/admins")).data.data,
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) =>
      (await platformApi.patch(`/api/v1/platform/admins/${id}`, { isActive })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform", "admins"] }),
  });

  return (
    <div>
      <PageHeader
        title="Platform Admins"
        subtitle="Internal Raquel team members with access to the platform admin panel."
        actions={
          me?.role === "SUPER_ADMIN" ? (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-md"
            >
              <Plus className="w-4 h-4" />
              Add Admin
            </button>
          ) : undefined
        }
      />

      <Card>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-slate-500">
            <tr className="text-left border-b border-slate-200">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Last login</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {(admins ?? []).map((a: any) => (
              <tr key={a.id} className="border-t border-slate-100">
                <td className="px-4 py-2.5">{a.name}</td>
                <td className="px-4 py-2.5 text-slate-600">{a.email}</td>
                <td className="px-4 py-2.5">
                  <Badge tone={ROLE_TONES[a.role] ?? "slate"}>
                    {a.role.replace("_", " ")}
                  </Badge>
                </td>
                <td className="px-4 py-2.5 text-slate-500 text-xs">
                  {formatRelativeDate(a.lastLoginAt)}
                </td>
                <td className="px-4 py-2.5">
                  {a.isActive ? (
                    <Badge tone="green">Active</Badge>
                  ) : (
                    <Badge tone="slate">Disabled</Badge>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {me?.role === "SUPER_ADMIN" && a.id !== me.id && (
                    <button
                      type="button"
                      onClick={() =>
                        toggleActive.mutate({ id: a.id, isActive: !a.isActive })
                      }
                      className="text-xs text-blue-700 hover:underline"
                    >
                      {a.isActive ? "Disable" : "Enable"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {addOpen && <AddAdminModal onClose={() => setAddOpen(false)} />}
    </div>
  );
}

function AddAdminModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async (data: any) =>
      (await platformApi.post("/api/v1/platform/admins", data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "admins"] });
      onClose();
    },
    onError: (err: any) =>
      setError(err.response?.data?.error?.message ?? "Failed to add admin"),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold">Add Platform Admin</h2>
          <button type="button" onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const f = new FormData(e.currentTarget);
            create.mutate({
              name: f.get("name"),
              email: f.get("email"),
              password: f.get("password"),
              role: f.get("role"),
            });
          }}
          className="p-6 space-y-4"
        >
          <Field label="Name">
            <input
              name="name"
              type="text"
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm"
            />
          </Field>
          <Field label="Email">
            <input
              name="email"
              type="email"
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm"
            />
          </Field>
          <Field label="Password (min 10 chars)">
            <input
              name="password"
              type="password"
              required
              minLength={10}
              className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm font-mono"
            />
          </Field>
          <Field label="Role">
            <select
              name="role"
              required
              defaultValue="PLATFORM_SUPPORT"
              className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm"
            >
              <option value="SUPER_ADMIN">Super Admin (full access)</option>
              <option value="PLATFORM_SUPPORT">Platform Support (view-only)</option>
              <option value="PLATFORM_BILLING">Billing (revenue + subscriptions)</option>
            </select>
          </Field>

          {error && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-slate-200 rounded-md text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={create.isPending}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-medium rounded-md"
            >
              {create.isPending ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
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
