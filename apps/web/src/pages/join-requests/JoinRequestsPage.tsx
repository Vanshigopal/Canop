import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button, Badge } from "@/components/primitives";
import { Check, X, Clock, User } from "lucide-react";

interface JoinRequest {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  studentName: string;
  studentPhone: string;
  studentEmail: string | null;
  city: string | null;
  state: string | null;
  guardians: Array<{ name: string; relation: string; phone: string }>;
  createdAt: string;
  reviewedBy: { name: string } | null;
}

const TABS = [
  { key: "PENDING", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
  { key: "", label: "All" },
] as const;

export function JoinRequestsPage() {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("PENDING");
  const [processing, setProcessing] = useState<string | null>(null);

  async function load(status?: string) {
    setLoading(true);
    try {
      const params = status ? `?status=${status}` : "";
      const res = await api.get(`/api/v1/join-requests${params}`);
      setRequests(res.data.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(tab || undefined); }, [tab]);

  async function handleApprove(id: string) {
    setProcessing(id);
    try {
      await api.post(`/api/v1/join-requests/${id}/approve`);
      load(tab || undefined);
    } finally {
      setProcessing(null);
    }
  }

  async function handleReject(id: string) {
    setProcessing(id);
    try {
      await api.post(`/api/v1/join-requests/${id}/reject`, { note: "" });
      load(tab || undefined);
    } finally {
      setProcessing(null);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl tracking-tight mb-1">Join Requests</h1>
      <p className="text-text-muted text-sm mb-6">Review and approve student enrollment requests.</p>

      <div className="flex gap-1 mb-6 p-1 rounded-xl bg-bg-warm w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${
              tab === t.key ? "bg-white text-text-primary shadow-sm" : "text-text-muted hover:text-text-body"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-text-dim text-sm">Loading...</div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="glass-panel p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-pastel-pink/60 grid place-items-center shrink-0">
                    <User size={18} className="text-coral" />
                  </div>
                  <div>
                    <h3 className="font-medium text-text-primary">{r.studentName}</h3>
                    <p className="text-2xs text-text-dim font-mono">{r.studentPhone}</p>
                    {r.city && <p className="text-2xs text-text-dim mt-0.5">{r.city}{r.state ? `, ${r.state}` : ""}</p>}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-2xs text-text-dim">
                        {r.guardians.length} guardian{r.guardians.length !== 1 ? "s" : ""}
                      </span>
                      <span className="text-2xs text-text-dim">&middot;</span>
                      <span className="text-2xs text-text-dim flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {r.status === "PENDING" ? (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleReject(r.id)}
                        loading={processing === r.id}
                        leftIcon={<X size={14} />}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(r.id)}
                        loading={processing === r.id}
                        leftIcon={<Check size={14} />}
                      >
                        Approve
                      </Button>
                    </>
                  ) : (
                    <Badge tone={r.status === "APPROVED" ? "success" : "danger"}>
                      {r.status.toLowerCase()}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
          {requests.length === 0 && (
            <div className="text-center py-12 text-text-dim text-sm">
              {tab === "PENDING" ? "No pending requests" : "No requests found"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
