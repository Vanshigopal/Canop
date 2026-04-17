import { Button } from "@/components/primitives";
import { useSocket } from "@/hooks/useSocket";
import { api } from "@/lib/api";
import { joinQrRoom, leaveQrRoom } from "@/lib/socket";
import { X } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  sessionId: string;
  onClose: () => void;
}

interface QrPayload {
  sessionId: string;
  qrCode: string;
  expiresAt: string;
  validFor: number;
  refreshInterval: number;
}

interface ScanEvent {
  studentId: string;
  studentName: string;
  totalScanned: number;
  totalStudents: number;
}

export function AttendanceQrModal({ sessionId, onClose }: Props) {
  const [qr, setQr] = useState<QrPayload | null>(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [scanInfo, setScanInfo] = useState<ScanEvent | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const generate = useCallback(
    async (refresh = false) => {
      setError("");
      try {
        const path = refresh ? "refresh-qr" : "generate-qr";
        const res = await api.post(`/api/v1/attendance/sessions/${sessionId}/${path}`);
        setQr(res.data.data);
      } catch (e: unknown) {
        setError(
          (e as { response?: { data?: { title?: string } } })?.response?.data?.title ||
            "Failed to generate QR",
        );
      }
    },
    [sessionId],
  );

  // Initial generation + cadence
  useEffect(() => {
    joinQrRoom(sessionId);
    generate(false);

    refreshTimer.current = setInterval(() => {
      generate(true);
    }, 15_000);

    return () => {
      leaveQrRoom(sessionId);
      if (refreshTimer.current) clearInterval(refreshTimer.current);
      api.post(`/api/v1/attendance/sessions/${sessionId}/stop-qr`).catch(() => {
        /* noop */
      });
    };
  }, [sessionId, generate]);

  // Progress bar animation
  useEffect(() => {
    if (!qr) return;
    if (progressTimer.current) clearInterval(progressTimer.current);
    const start = Date.now();
    progressTimer.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / 15_000) * 100);
      setProgress(pct);
      if (pct >= 100 && progressTimer.current) {
        clearInterval(progressTimer.current);
      }
    }, 100);
    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, [qr]);

  // Listen for server-pushed refresh (from other tutor devices, etc.)
  useSocket<QrPayload>("attendance:qr:refresh", (data) => {
    if (data.sessionId === sessionId) {
      setQr(data);
    }
  });

  useSocket<ScanEvent>("attendance:scanned", (data) => {
    setScanInfo(data);
  });

  const tenantSlug = getTenantSlug();
  const host = window.location.host;
  const baseHost =
    tenantSlug && !host.startsWith(`${tenantSlug}.`) ? `${tenantSlug}.${host}` : host;
  const url = qr?.qrCode
    ? `${window.location.protocol}//${baseHost}/attendance/scan/${qr.qrCode}`
    : "";

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
          <div>
            <h2 className="font-display text-lg">Scan to mark attendance</h2>
            <p className="text-2xs text-text-dim mt-0.5">Refreshes every 15 seconds</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-text-dim hover:text-text-body"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-danger/8 border border-danger/20 px-4 py-2.5 text-xs text-danger">
            {error}
          </div>
        )}

        <div className="flex flex-col items-center gap-4">
          <div
            className="p-4 bg-white rounded-lg shadow-sm relative"
            style={{ transition: "opacity 200ms ease" }}
          >
            {qr?.qrCode ? (
              <QRCodeCanvas
                key={qr.qrCode}
                value={url}
                size={240}
                level="M"
                style={{ animation: "fadeIn 300ms ease" }}
              />
            ) : (
              <div className="w-[240px] h-[240px] grid place-items-center text-xs text-text-dim">
                Generating...
              </div>
            )}
          </div>

          <div className="w-full">
            <div className="h-1.5 bg-bg-warm rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${progress}%`,
                  background: "linear-gradient(90deg, #4F46E5, #7C3AED)",
                  transition: "width 100ms linear",
                }}
              />
            </div>
            <div className="flex items-center justify-between mt-1.5 text-2xs text-text-dim">
              <span>New code in {Math.max(0, Math.ceil((100 - progress) * 0.15))}s</span>
              {scanInfo ? (
                <span className="text-success font-medium">
                  Scanned: {scanInfo.totalScanned} / {scanInfo.totalStudents}
                </span>
              ) : (
                <span>Waiting for scans...</span>
              )}
            </div>
          </div>

          <div className="text-2xs text-text-muted text-center break-all max-w-xs font-mono">
            {url}
          </div>

          <Button variant="secondary" size="sm" onClick={() => generate(true)}>
            Refresh now
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
