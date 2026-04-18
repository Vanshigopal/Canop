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
import type { StudentProfile as StudentProfileType } from "@/components/portal/portal-types";

export function StudentProfile() {
  const { logout } = useAuth();
  const [profile, setProfile] = useState<StudentProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    email: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/api/v1/student/profile");
      setProfile(data.data);
      setForm({
        email: data.data.email ?? "",
        address: data.data.address ?? "",
        city: data.data.city ?? "",
        state: data.data.state ?? "",
        pincode: data.data.pincode ?? "",
      });
    } catch {
      setProfile(null);
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
      await api.patch("/api/v1/student/profile", form);
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

  if (loading) return <PortalSkeleton height={400} />;
  if (!profile) return <Empty title="Could not load profile" />;

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
            style={{ backgroundColor: "#E0E7FF", color: "#4F46E5" }}
          >
            {profile.name[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-lg font-medium truncate"
              style={{ fontFamily: "Fraunces, serif", color: "#2C2C2A" }}
            >
              {profile.name}
            </p>
            <p className="text-xs mt-0.5 truncate" style={{ color: "#6B6A66" }}>
              {profile.batch?.class?.name ?? profile.batch?.name ?? "—"}
              {profile.rollNumber ? ` · Roll ${profile.rollNumber}` : ""}
            </p>
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
            <Field label="Email" value={profile.email} />
            <Field label="Phone" value={profile.phone ?? "—"} />
            <Field
              label="Address"
              value={
                [profile.address, profile.city, profile.state, profile.pincode]
                  .filter(Boolean)
                  .join(", ") || "—"
              }
            />
            <Field
              label="Date of birth"
              value={
                profile.dateOfBirth
                  ? new Date(profile.dateOfBirth).toLocaleDateString("en-IN")
                  : "—"
              }
            />
            <Field
              label="Enrolled"
              value={new Date(profile.enrolledAt).toLocaleDateString("en-IN")}
            />
            {profile.bloodGroup && (
              <Field label="Blood group" value={profile.bloodGroup} />
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <InputField
              label="Email"
              value={form.email}
              onChange={(v) => setForm((f) => ({ ...f, email: v }))}
              type="email"
            />
            <InputField
              label="Address"
              value={form.address}
              onChange={(v) => setForm((f) => ({ ...f, address: v }))}
            />
            <InputField
              label="City"
              value={form.city}
              onChange={(v) => setForm((f) => ({ ...f, city: v }))}
            />
            <InputField
              label="State"
              value={form.state}
              onChange={(v) => setForm((f) => ({ ...f, state: v }))}
            />
            <InputField
              label="Pincode"
              value={form.pincode}
              onChange={(v) => setForm((f) => ({ ...f, pincode: v }))}
              inputMode="numeric"
            />
            <div className="flex gap-2 mt-2">
              <SecondaryButton
                fullWidth
                onClick={() => {
                  setEditing(false);
                  setForm({
                    email: profile.email ?? "",
                    address: profile.address ?? "",
                    city: profile.city ?? "",
                    state: profile.state ?? "",
                    pincode: profile.pincode ?? "",
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
