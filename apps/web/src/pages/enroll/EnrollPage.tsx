import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button, Input } from "@/components/primitives";
import { CheckCircle } from "lucide-react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface InviteInfo {
  isValid: boolean;
  tenantName?: string;
  batchName?: string | null;
  className?: string | null;
  message?: string;
}

interface GuardianForm {
  name: string;
  relation: "FATHER" | "MOTHER" | "GUARDIAN" | "OTHER";
  phone: string;
  email: string;
  occupation: string;
  isEmergency: boolean;
}

const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal", "Delhi", "Jammu & Kashmir", "Ladakh",
];

const emptyGuardian = (): GuardianForm => ({
  name: "", relation: "FATHER", phone: "", email: "", occupation: "", isEmergency: false,
});

export function EnrollPage() {
  const { code } = useParams<{ code: string }>();
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    studentName: "", studentPhone: "", studentEmail: "", dateOfBirth: "",
    gender: "" as "" | "MALE" | "FEMALE" | "OTHER",
    address: "", city: "", state: "", pincode: "", previousSchool: "", bloodGroup: "",
  });
  const [guardians, setGuardians] = useState<GuardianForm[]>([{ ...emptyGuardian(), isEmergency: true }]);

  useEffect(() => {
    if (!code) return;
    axios.get(`${API}/api/v1/enroll/${code}`)
      .then((r) => setInfo(r.data.data))
      .catch(() => setInfo({ isValid: false, message: "Could not validate this invite link" }))
      .finally(() => setLoading(false));
  }, [code]);

  function updateGuardian(i: number, field: string, value: unknown) {
    setGuardians((prev) => prev.map((g, idx) => idx === i ? { ...g, [field]: value } : g));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const hasEmergency = guardians.some((g) => g.isEmergency);
    if (!hasEmergency) { setError("At least one guardian must be marked as emergency contact"); return; }

    setSubmitting(true);
    try {
      const phone = form.studentPhone.startsWith("+") ? form.studentPhone : `+91${form.studentPhone}`;
      await axios.post(`${API}/api/v1/enroll/${code}`, {
        ...form,
        studentPhone: phone,
        gender: form.gender || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        guardians: guardians.map((g) => ({
          ...g,
          phone: g.phone.startsWith("+") ? g.phone : `+91${g.phone}`,
          email: g.email || undefined,
          occupation: g.occupation || undefined,
        })),
      });
      setSubmitted(true);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.title || "Submission failed");
      } else {
        setError("Connection error");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="text-text-dim text-sm">Validating invite...</div>
      </div>
    );
  }

  if (!info?.isValid) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center p-6">
        <div className="glass-panel p-8 max-w-sm text-center">
          <h2 className="font-display text-xl mb-2">Invalid Link</h2>
          <p className="text-sm text-text-muted">{info?.message || "This invitation link is no longer valid."}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center p-6">
        <div className="glass-panel p-8 max-w-md text-center">
          <div className="w-12 h-12 rounded-full bg-pastel-sage grid place-items-center mx-auto mb-4">
            <CheckCircle size={22} className="text-success" />
          </div>
          <h2 className="font-display text-xl mb-2">Application Submitted</h2>
          <p className="text-sm text-text-muted mb-4">
            Your enrollment application has been submitted to {info.tenantName}. You'll be notified when it's approved.
          </p>
          <p className="text-xs text-text-dim">
            Your phone number will be your login once approved.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="font-display text-xl tracking-tight">{info.tenantName}</h1>
          {info.batchName && <p className="text-2xs text-text-dim">{info.className} &middot; {info.batchName}</p>}
        </div>

        <div className="glass-panel p-6 sm:p-8">
          <h2 className="font-display text-lg mb-1">Student Enrollment</h2>
          <p className="text-sm text-text-muted mb-6">Fill in the details below to apply for enrollment.</p>

          {error && <div className="mb-4 rounded-lg bg-danger/8 border border-danger/20 px-4 py-2.5 text-xs text-danger">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal */}
            <section>
              <h3 className="font-mono text-2xs uppercase tracking-widest text-text-dim mb-3">Personal Information</h3>
              <div className="space-y-3">
                <Input label="Full Name" value={form.studentName} onChange={(e) => setForm({ ...form, studentName: e.target.value })} required />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-text-muted">Phone Number</label>
                    <div className="flex gap-2">
                      <div className="flex items-center rounded-md border border-border-soft bg-white/92 px-3 text-sm text-text-muted min-w-[52px] justify-center">+91</div>
                      <input
                        type="tel"
                        placeholder="9876543210"
                        value={form.studentPhone}
                        onChange={(e) => setForm({ ...form, studentPhone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                        required
                        className="flex-1 rounded-md border border-border-soft bg-white/92 px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-dim outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/15"
                      />
                    </div>
                  </div>
                  <Input label="Email (optional)" type="email" value={form.studentEmail} onChange={(e) => setForm({ ...form, studentEmail: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input label="Date of Birth" type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-text-muted">Gender</label>
                    <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as typeof form.gender })} className="w-full rounded-md border border-border-soft bg-white/92 px-3.5 py-2.5 text-sm outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/15">
                      <option value="">Select...</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-text-muted">Blood Group</label>
                    <select value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })} className="w-full rounded-md border border-border-soft bg-white/92 px-3.5 py-2.5 text-sm outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/15">
                      <option value="">Select...</option>
                      {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </section>

            {/* Address */}
            <section>
              <h3 className="font-mono text-2xs uppercase tracking-widest text-text-dim mb-3">Address</h3>
              <div className="space-y-3">
                <Input label="Full Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-text-muted">State</label>
                    <select value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="w-full rounded-md border border-border-soft bg-white/92 px-3.5 py-2.5 text-sm outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/15">
                      <option value="">Select...</option>
                      {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <Input label="Pincode" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })} />
                </div>
              </div>
            </section>

            {/* Academic */}
            <section>
              <h3 className="font-mono text-2xs uppercase tracking-widest text-text-dim mb-3">Academic</h3>
              <Input label="Previous School / Institute" value={form.previousSchool} onChange={(e) => setForm({ ...form, previousSchool: e.target.value })} />
            </section>

            {/* Guardians */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-mono text-2xs uppercase tracking-widest text-text-dim">Guardian Details</h3>
                {guardians.length < 4 && (
                  <button type="button" onClick={() => setGuardians([...guardians, emptyGuardian()])} className="text-xs text-indigo font-medium hover:underline">
                    + Add Guardian
                  </button>
                )}
              </div>
              <div className="space-y-4">
                {guardians.map((g, i) => (
                  <div key={i} className="rounded-xl border border-border-soft p-4 bg-white/40">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-text-muted">Guardian {i + 1}</span>
                      {guardians.length > 1 && (
                        <button type="button" onClick={() => setGuardians(guardians.filter((_, idx) => idx !== i))} className="text-2xs text-danger hover:underline">Remove</button>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input label="Name" value={g.name} onChange={(e) => updateGuardian(i, "name", e.target.value)} required />
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-text-muted">Relation</label>
                          <select value={g.relation} onChange={(e) => updateGuardian(i, "relation", e.target.value)} className="w-full rounded-md border border-border-soft bg-white/92 px-3.5 py-2.5 text-sm outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/15">
                            <option value="FATHER">Father</option>
                            <option value="MOTHER">Mother</option>
                            <option value="GUARDIAN">Guardian</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-text-muted">Phone</label>
                          <div className="flex gap-2">
                            <div className="flex items-center rounded-md border border-border-soft bg-white/92 px-3 text-sm text-text-muted min-w-[52px] justify-center">+91</div>
                            <input
                              type="tel"
                              placeholder="9876543210"
                              value={g.phone}
                              onChange={(e) => updateGuardian(i, "phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                              required
                              className="flex-1 rounded-md border border-border-soft bg-white/92 px-3.5 py-2.5 text-sm outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/15"
                            />
                          </div>
                        </div>
                        <Input label="Email (optional)" type="email" value={g.email} onChange={(e) => updateGuardian(i, "email", e.target.value)} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                        <Input label="Occupation" value={g.occupation} onChange={(e) => updateGuardian(i, "occupation", e.target.value)} />
                        <label className="flex items-center gap-2 text-xs cursor-pointer pb-2.5">
                          <input type="checkbox" checked={g.isEmergency} onChange={(e) => updateGuardian(i, "isEmergency", e.target.checked)} className="rounded" />
                          Emergency contact
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <Button type="submit" fullWidth loading={submitting}>Submit Application</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
