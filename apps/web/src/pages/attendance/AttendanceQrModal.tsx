import { Button } from "@/components/primitives";
import { api } from "@/lib/api";
import { RefreshCw, X } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { useEffect, useRef, useState } from "react";

interface Props {
  sessionId: string;
  initialCode: string | null;
  initialExpiresAt: string | null;
  onClose: () => void;
}

export function AttendanceQrModal({ sessionId, initialCode, initialExpiresAt, onClose }: Props) {
  const [qrCode, setQrCode] = useState<string | null>(initialCode);
  const [expiresAt, setExpiresAt] = useState<string | null>(initialExpiresAt);
  const [remaining, setRemaining] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const res = await api.post(`/api/v1/attendance/sessions/${sessionId}/generate-qr`);
      setQrCode(res.data.data.qrCode);
      setExpiresAt(res.data.data.expiresAt);
    } catch (e: unknown) {
      setError(
        (e as { response?: { data?: { title?: string } } })?.response?.data?.title ||
          "Failed to generate QR",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!initialCode) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!expiresAt) {
      setRemaining(0);
      return;
    }
    function tick() {
      if (!expiresAt) return;
      const r = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setRemaining(r);
    }
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [expiresAt]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const expired = remaining === 0;
  const tenantSlug = getTenantSlug();
  const host = window.location.host;
  const baseHost =
    tenantSlug && !host.startsWith(`${tenantSlug}.`) ? `${tenantSlug}.${host}` : host;
  const url = qrCode ? `${window.location.protocol}//${baseHost}/attendance/scan/${qrCode}` : "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="glass-panel w-full max-w-md mx-4 p-6"
        style={{ animation: "scaleIn 0.15s ease-out" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg">Scan to mark attendance</h2>
          <button onClick={onClose} className="p-1 text-text-dim hover:text-text-body">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-danger/8 border border-danger/20 px-4 py-2.5 text-xs text-danger">
            {error}
          </div>
        )}

        <div className="flex flex-col items-center gap-4">
          <div className="p-4 bg-white rounded-lg shadow-sm">
            {qrCode && !expired ? (
              <QRCodeCanvas value={url} size={240} level="M" />
            ) : (
              <div className="w-[240px] h-[240px] grid place-items-center text-xs text-text-dim">
                {expired ? "QR expired" : "Generating..."}
              </div>
            )}
          </div>

          {qrCode && !expired && (
            <div className="text-center">
              <div
                className={`font-mono text-2xl font-semibold ${remaining < 60 ? "text-danger" : "text-indigo"}`}
              >
                {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
              </div>
              <div className="text-2xs text-text-dim uppercase tracking-wider">Expires in</div>
            </div>
          )}

          <div className="text-2xs text-text-muted text-center break-all max-w-xs">{url}</div>

          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw size={14} />}
            loading={loading}
            onClick={generate}
          >
            {expired ? "Generate New QR" : "Refresh QR"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function getTenantSlug(): string | null {
  const host = window.location.hostname;
  const parts = host.split(".");
  if (parts.length >= 2) {
    const slug = parts[0];
    if (slug && !["www", "api", "app", "admin", "localhost"].includes(slug)) {
      return slug;
    }
  }
  return null;
}
