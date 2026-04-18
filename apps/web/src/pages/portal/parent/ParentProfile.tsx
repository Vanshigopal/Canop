import { Edit2, LogOut, Save, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import {
  Empty,
  PortalCard,
  PortalSkeleton,
  PrimaryButton,
  SecondaryButton,
  SectionHeader,
} from "@/components/portal/PortalPrimitives";

interface ParentMe {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  guardianId: string | null;
  displayName: string;
  relationship: string | null;
  occupation: string | null;
  guardianships: Array<{
    id: string;
    name: string;
    relation: string;
    phone: string;
    email: string | null;
    occupation: string | null;
    isEmergency: boolean;
  }>;
}

export function ParentProfile() {
  const { logout } = useAuth();
  const [me, setMe] = useState<ParentMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ email: "", phone: "", occupation: "" });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/api/v1/parent/me");
      setMe(data.data);
      setForm({
        email: data.data.email ?? "",
        phone: data.data.phone ?? "",
        occupation: data.data.occupation ?? "",
      });
    } catch {
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch("/api/v1/parent/profile", form);
      setToast("Saved");
      setEditing(false);
      await load();
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Save failed");
      setTimeout(() => setToast(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  const [children, setChildren] = useState<
    Array<{ id: string; name: string; batchName: string | null; rollNumber: string | null }>
  >([]);
  useEffect(() => {
    api
      .get("/api/v1/parent/children")
      .then((r) => setChildren(r.data.data ?? []))
      .catch(() => setChildren([]));
  }, []);

  if (loading) return <PortalSkeleton height={400} />;
  if (!me) return <Empty title="Could not load profile" />;

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader title="Profile" />

      {toast && (
        <div
          className="glass-panel p-3 text-sm font-medium"
          style={{ color: "#14532D", backgroundColor: "#DCFCE7" }}
        >
          {toast}
        </div>
      )}

      <PortalCard>
        <div className="flex items-center gap-4 mb-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-semibold"
            style={{ backgroundColor: "#FED7AA", color: "#C2410C" }}
          >
            {me.displayName[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-lg font-medium truncate"
              style={{ fontFamily: "Fraunces, serif", color: "#2C2C2A" }}
            >
              {me.displayName}
            </p>
            {me.relationship && (
              <p className="text-xs mt-0.5" style={{ color: "#6B6A66" }}>
                {me.relationship}
              </p>
            )}
          </div>
          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#F1EFE8", minWidth: 44, minHeight: 44 }}
              aria-label="Edit profile"
            >
              <Edit2 size={16} color="#2C2C2A" />
            </button>
          )}
        </div>

        {!editing ? (
          <div className="flex flex-col gap-3">
            <Field label="Email" value={me.email} />
            <Field label="Phone" value={me.phone ?? "—"} />
            <Field label="Occupation" value={me.occupation ?? "—"} />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <InputField
              label="Email"
              type="email"
              value={form.email}
              onChange={(v) => setForm((f) => ({ ...f, email: v }))}
            />
            <InputField
              label="Phone"
              inputMode="tel"
              value={form.phone}
              onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
            />
            <InputField
              label="Occupation"
              value={form.occupation}
              onChange={(v) => setForm((f) => ({ ...f, occupation: v }))}
            />
            <div className="flex gap-2 mt-2">
              <SecondaryButton
                fullWidth
                onClick={() => {
                  setEditing(false);
                  setForm({
                    email: me.email ?? "",
                    phone: me.phone ?? "",
                    occupation: me.occupation ?? "",
                  });
                }}
              >
                <X size={16} />
                Cancel
              </SecondaryButton>
              <PrimaryButton fullWidth disabled={saving} onClick={save}>
                <Save size={16} />
                {saving ? "Saving…" : "Save"}
              </PrimaryButton>
            </div>
          </div>
        )}
      </PortalCard>

      {children.length > 0 && (
        <PortalCard>
          <p
            className="text-[10px] uppercase tracking-[0.15em] mb-3"
            style={{ color: "#6B6A66", fontWeight: 600 }}
          >
            Children
          </p>
          <div className="flex flex-col gap-2">
            {children.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between py-1"
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: "#2C2C2A" }}>
                    {c.name}
                  </p>
                  <p className="text-xs" style={{ color: "#6B6A66" }}>
                    {c.batchName ?? "—"}
                    {c.rollNumber ? ` · Roll ${c.rollNumber}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </PortalCard>
      )}

      <SecondaryButton fullWidth onClick={logout}>
        <LogOut size={16} />
        Sign out
      </SecondaryButton>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p
        className="text-[10px] uppercase tracking-wider mb-0.5"
        style={{ color: "#6B6A66", fontWeight: 600 }}
      >
        {label}
      </p>
      <p className="text-sm" style={{ color: "#2C2C2A" }}>
        {value}
      </p>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  inputMode?: "text" | "numeric" | "email" | "tel";
}) {
  return (
    <label className="flex flex-col gap-1">
      <span
        className="text-[10px] uppercase tracking-wider"
        style={{ color: "#6B6A66", fontWeight: 600 }}
      >
        {label}
      </span>
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 px-4 rounded-xl border"
        style={{
          fontSize: 16,
          backgroundColor: "#FFFFFF",
          borderColor: "rgba(90, 70, 50, 0.12)",
          color: "#2C2C2A",
          minHeight: 44,
        }}
      />
    </label>
  );
}
