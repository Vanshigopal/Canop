import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, X } from "lucide-react";
import { useState, useMemo } from "react";
import { platformApi } from "@/stores/platform-auth";

const PLAN_DESC: Record<string, string> = {
  FREE_TRIAL: "50 students · 14-day trial · ₹0/mo",
  STARTER: "100 students · 5 teachers · ₹2,999/mo",
  GROWTH: "500 students · 15 teachers · AI + OMR + Video · ₹7,999/mo",
  PROFESSIONAL: "2000 students · 50 teachers · All features · ₹14,999/mo",
  ENTERPRISE: "Unlimited · Custom pricing",
  CUSTOM: "Customizable plan · Set price manually",
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 30);
}

function generatePassword() {
  const chars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 14 }, () =>
    chars[Math.floor(Math.random() * chars.length)],
  ).join("");
}

export function CreateTenantModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [slug, setSlug] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [password, setPassword] = useState(() => generatePassword());
  const [plan, setPlan] = useState("STARTER");
  const [trialDays, setTrialDays] = useState(14);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<null | {
    loginUrl: string;
    email: string;
    password: string;
  }>(null);

  const effectiveSlug = useMemo(
    () => (slugEdited ? slug : slugify(name)),
    [slug, slugEdited, name],
  );

  const create = useMutation({
    mutationFn: async () => {
      const res = await platformApi.post("/api/v1/platform/tenants", {
        tenantName: name,
        slug: effectiveSlug,
        ownerName,
        ownerEmail,
        ownerPassword: password,
        plan,
        trialDays: plan === "FREE_TRIAL" ? trialDays : undefined,
      });
      return res.data.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["platform", "tenants"] });
      qc.invalidateQueries({ queryKey: ["platform", "overview"] });
      setSuccess({ loginUrl: data.loginUrl, email: ownerEmail, password });
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message ?? "Failed to create tenant");
    },
  });

  if (!open) return null;

  const reset = () => {
    setName("");
    setSlug("");
    setSlugEdited(false);
    setOwnerName("");
    setOwnerEmail("");
    setPassword(generatePassword());
    setPlan("STARTER");
    setError(null);
    setSuccess(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold">
            {success ? "Tenant created" : "Add new institute"}
          </h2>
          <button
            type="button"
            onClick={reset}
            className="p-1 hover:bg-slate-100 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {success ? (
          <div className="p-6 space-y-4 text-sm">
            <div className="bg-emerald-50 border border-emerald-200 rounded-md p-4 text-emerald-900">
              <div className="font-medium mb-2 inline-flex items-center gap-2">
                <CheckCircle size={16} /> Institute created successfully
              </div>
              <div className="text-xs">
                Login details (show these to the owner — they won't be saved anywhere)
              </div>
            </div>
            <div className="space-y-2">
              <KV label="Login URL" value={success.loginUrl} />
              <KV label="Email" value={success.email} />
              <KV label="Password" value={success.password} />
            </div>
            <button
              type="button"
              onClick={reset}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-md"
            >
              Done
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              create.mutate();
            }}
            className="p-6 space-y-4"
          >
            <Field label="Institute Name">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm"
                placeholder="ABC Coaching Institute"
              />
            </Field>

            <Field label="Slug (subdomain)">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  required
                  value={effectiveSlug}
                  onChange={(e) => {
                    setSlugEdited(true);
                    setSlug(slugify(e.target.value));
                  }}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-md text-sm font-mono"
                  placeholder="abc-coaching"
                />
                <span className="text-xs text-slate-400">.canop.app</span>
              </div>
            </Field>

            <Field label="Owner Name">
              <input
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm"
              />
            </Field>

            <Field label="Owner Email">
              <input
                type="email"
                required
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm"
              />
            </Field>

            <Field label="Temporary Password">
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-md text-sm font-mono"
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setPassword(generatePassword())}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-md hover:bg-slate-50"
                >
                  Regenerate
                </button>
              </div>
            </Field>

            <Field label="Plan">
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm"
              >
                <option value="FREE_TRIAL">Free Trial</option>
                <option value="STARTER">Starter</option>
                <option value="GROWTH">Growth</option>
                <option value="PROFESSIONAL">Professional</option>
                <option value="ENTERPRISE">Enterprise</option>
                <option value="CUSTOM">Custom</option>
              </select>
              <div className="text-xs text-slate-500 mt-1">{PLAN_DESC[plan]}</div>
            </Field>

            {plan === "FREE_TRIAL" && (
              <Field label="Trial Period (days)">
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={trialDays}
                  onChange={(e) => setTrialDays(Number(e.target.value))}
                  className="w-24 px-3 py-2 border border-slate-200 rounded-md text-sm"
                />
              </Field>
            )}

            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={reset}
                className="flex-1 py-2 border border-slate-200 rounded-md text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={create.isPending}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-medium rounded-md"
              >
                {create.isPending ? "Creating…" : "Create Institute"}
              </button>
            </div>
          </form>
        )}
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

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <span className="text-xs text-slate-500 uppercase tracking-wider">{label}</span>
      <code
        onClick={(e) => {
          const t = e.currentTarget.textContent ?? "";
          void navigator.clipboard.writeText(t);
        }}
        className="text-xs bg-slate-100 px-2 py-1 rounded cursor-pointer hover:bg-slate-200"
        title="Click to copy"
      >
        {value}
      </code>
    </div>
  );
}
