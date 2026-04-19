import { BrandMark } from "@/components/brand/BrandMark";
import { AuroraBackground } from "@/components/layout/AuroraBackground";
import { Button } from "@/components/primitives";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

type State =
  | { kind: "loading" }
  | { kind: "needs-auth" }
  | { kind: "invalid"; reason: string }
  | { kind: "expired" }
  | { kind: "finalized" }
  | {
      kind: "success";
      session: {
        batch: { name: string };
        subject: { name: string } | null;
        date: string;
        startTime: string | null;
        endTime: string | null;
        type: string;
      };
      isGuest: boolean;
    }
  | { kind: "error"; message: string };

export function AttendanceScanPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!code) return;

    async function run() {
      if (!isAuthenticated) {
        try {
          const status = await api.get(`/api/v1/attendance/qr/${code}/status`);
          if (!status.data.data.valid) {
            const reason = status.data.data.reason as string;
            if (reason === "QR_EXPIRED") setState({ kind: "expired" });
            else if (reason === "SESSION_FINALIZED") setState({ kind: "finalized" });
            else setState({ kind: "invalid", reason });
            return;
          }
        } catch {
          // proceed anyway
        }
        setState({ kind: "needs-auth" });
        return;
      }

      if (user?.role !== "STUDENT") {
        setState({ kind: "error", message: "Only students can mark QR attendance" });
        return;
      }

      try {
        const res = await api.post("/api/v1/attendance/qr/verify", { qrCode: code });
        setState({
          kind: "success",
          session: res.data.data.session,
          isGuest: res.data.data.isGuest,
        });
      } catch (e: unknown) {
        const err = e as { response?: { data?: { code?: string; title?: string } } };
        const errCode = err?.response?.data?.code;
        const msg = err?.response?.data?.title || "Failed to verify QR";
        if (errCode === "QR_EXPIRED") setState({ kind: "expired" });
        else if (errCode === "SESSION_FINALIZED") setState({ kind: "finalized" });
        else setState({ kind: "error", message: msg });
      }
    }

    run();
  }, [code, isAuthenticated, user?.role]);

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6">
      <AuroraBackground />
      <div className="relative z-10 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <BrandMark />
        </div>
        <div className="glass-panel p-8">
          {state.kind === "loading" && <LoadingState />}
          {state.kind === "needs-auth" && (
            <NeedsAuthState
              onLogin={() => {
                sessionStorage.setItem("canop:returnTo", window.location.pathname);
                navigate("/login");
              }}
            />
          )}
          {state.kind === "invalid" && <InvalidState reason={state.reason} />}
          {state.kind === "expired" && <ExpiredState />}
          {state.kind === "finalized" && <FinalizedState />}
          {state.kind === "success" && (
            <SuccessState session={state.session} isGuest={state.isGuest} />
          )}
          {state.kind === "error" && <ErrorState message={state.message} />}
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="text-center py-6">
      <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo border-t-transparent mb-4" />
      <p className="text-sm text-text-muted">Verifying QR code...</p>
    </div>
  );
}

function NeedsAuthState({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="text-center">
      <div className="w-14 h-14 rounded-full bg-indigo/10 grid place-items-center mx-auto mb-4">
        <AlertCircle className="text-indigo" size={28} />
      </div>
      <h2 className="font-display text-xl mb-2">Login required</h2>
      <p className="text-sm text-text-muted mb-6">
        Sign in with your student account to mark attendance.
      </p>
      <Button fullWidth onClick={onLogin}>
        Go to login
      </Button>
    </div>
  );
}

function InvalidState({ reason }: { reason: string }) {
  return (
    <div className="text-center">
      <div className="w-14 h-14 rounded-full bg-danger/10 grid place-items-center mx-auto mb-4">
        <XCircle className="text-danger" size={28} />
      </div>
      <h2 className="font-display text-xl mb-2">Invalid QR code</h2>
      <p className="text-sm text-text-muted">
        {reason === "QR_NOT_FOUND" ? "This QR code doesn't exist." : reason}
      </p>
    </div>
  );
}

function ExpiredState() {
  return (
    <div className="text-center">
      <div className="w-14 h-14 rounded-full bg-warning/10 grid place-items-center mx-auto mb-4">
        <Clock className="text-warning" size={28} />
      </div>
      <h2 className="font-display text-xl mb-2">QR code expired</h2>
      <p className="text-sm text-text-muted">Please ask your tutor to generate a new QR code.</p>
    </div>
  );
}

function FinalizedState() {
  return (
    <div className="text-center">
      <div className="w-14 h-14 rounded-full bg-neutral-200 grid place-items-center mx-auto mb-4">
        <AlertCircle className="text-text-muted" size={28} />
      </div>
      <h2 className="font-display text-xl mb-2">Session finalized</h2>
      <p className="text-sm text-text-muted">This attendance session has been closed.</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="text-center">
      <div className="w-14 h-14 rounded-full bg-danger/10 grid place-items-center mx-auto mb-4">
        <XCircle className="text-danger" size={28} />
      </div>
      <h2 className="font-display text-xl mb-2">Something went wrong</h2>
      <p className="text-sm text-text-muted">{message}</p>
    </div>
  );
}

function SuccessState({
  session,
  isGuest,
}: {
  session: {
    batch: { name: string };
    subject: { name: string } | null;
    date: string;
    startTime: string | null;
    endTime: string | null;
    type: string;
  };
  isGuest: boolean;
}) {
  return (
    <div className="text-center">
      <div
        className="w-16 h-16 rounded-full bg-success/10 grid place-items-center mx-auto mb-4"
        style={{ animation: "scaleIn 0.3s ease-out" }}
      >
        <CheckCircle2 className="text-success" size={40} strokeWidth={2.5} />
      </div>
      <h2 className="font-display text-2xl mb-1">Attendance marked</h2>
      <p className="text-sm text-success mb-6 font-medium">
        You&apos;re in for today&apos;s {session.type.toLowerCase()}.
      </p>

      <div className="rounded-md bg-white/60 border border-border-soft p-4 text-left space-y-2">
        <Row label="Batch" value={session.batch.name} />
        {session.subject && <Row label="Subject" value={session.subject.name} />}
        <Row
          label="Date"
          value={new Date(session.date).toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        />
        {session.startTime && (
          <Row
            label="Time"
            value={`${session.startTime}${session.endTime ? ` — ${session.endTime}` : ""}`}
          />
        )}
        {isGuest && (
          <div className="pt-2 text-xs text-indigo">
            Recorded as guest attendance. Your home-batch record will also reflect this.
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-2xs uppercase tracking-wider text-text-dim">{label}</dt>
      <dd className="text-sm font-medium text-text-primary">{value}</dd>
    </div>
  );
}
