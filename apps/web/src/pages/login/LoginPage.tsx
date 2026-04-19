import { OTPInput } from "@/components/primitives/OTPInput";
import { Button, Input } from "@/components/primitives";
import { useAuthStore } from "@/stores/auth";
import { cn } from "@canop/ui";
import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

type AuthTab = "admin" | "student";

const ROLE_REDIRECT: Record<string, string> = {
  ADMIN: "/dashboard",
  TEACHER: "/dashboard",
  STAFF: "/dashboard",
  STUDENT: "/portal",
  PARENT: "/parent",
};

export function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user, loginWithEmail, sendOtp, verifyOtp, isLoading } = useAuthStore();

  const [tab, setTab] = useState<AuthTab>("admin");
  const [error, setError] = useState("");

  // Admin/Teacher form
  const [tenantSlug, setTenantSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Student/Parent form
  const [studentSlug, setStudentSlug] = useState("");
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(ROLE_REDIRECT[user.role] || "/dashboard", { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const startCooldown = useCallback(() => {
    setResendCooldown(30);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => { if (cooldownRef.current) clearInterval(cooldownRef.current); }, []);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await loginWithEmail(tenantSlug, email, password);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.title || "Login failed");
      } else {
        setError("Connection error — is the API running?");
      }
    }
  }

  async function handleSendOtp(e?: React.FormEvent) {
    e?.preventDefault();
    setError("");
    try {
      const fullPhone = phone.startsWith("+") ? phone : `+91${phone}`;
      const masked = await sendOtp(studentSlug, fullPhone);
      setMaskedPhone(masked);
      setOtpSent(true);
      setOtp("");
      startCooldown();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.title || "Failed to send OTP");
      } else {
        setError("Connection error — is the API running?");
      }
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (otp.length < 6) {
      setError("Enter the complete 6-digit OTP");
      return;
    }
    try {
      const fullPhone = phone.startsWith("+") ? phone : `+91${phone}`;
      await verifyOtp(studentSlug, fullPhone, otp);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.title || "Invalid OTP");
      } else {
        setError("Connection error — is the API running?");
      }
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 sm:p-10 bg-[#faf7f2]">
      {/* Logo block — shown once, above the form */}
      <div className="flex flex-col items-center mb-8">
        <img
          src="/logo.svg"
          alt="Canop"
          className="w-[120px] h-[120px] mb-4"
        />
        <h1
          className="text-[32px] leading-none"
          style={{
            fontFamily: "'Fraunces', serif",
            fontStyle: "italic",
            fontWeight: 400,
            letterSpacing: "7px",
            color: "#2C2C2A",
          }}
        >
          Canop
        </h1>
        <p
          className="text-[10px] mt-3"
          style={{
            fontFamily: "'Manrope', sans-serif",
            letterSpacing: "4px",
            color: "#818CF8",
            opacity: 0.4,
          }}
        >
          NAVIGATE YOUR POTENTIAL
        </p>
      </div>

      <div className="w-full max-w-[400px] animate-fade-up">
          {/* Tab switcher */}
          <div className="flex rounded-xl bg-[#f0ebe4] p-1 mb-6">
            <button
              type="button"
              onClick={() => { setTab("admin"); setError(""); }}
              className={cn(
                "flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all duration-200",
                tab === "admin"
                  ? "bg-white text-text-primary shadow-sm"
                  : "text-text-muted hover:text-text-body",
              )}
            >
              Admin / Teacher
            </button>
            <button
              type="button"
              onClick={() => { setTab("student"); setError(""); setOtpSent(false); }}
              className={cn(
                "flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all duration-200",
                tab === "student"
                  ? "bg-white text-text-primary shadow-sm"
                  : "text-text-muted hover:text-text-body",
              )}
            >
              Student / Parent
            </button>
          </div>

          {/* Trust badge */}
          <div className="flex items-center gap-2 mb-6">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-slow" />
            <span className="text-2xs text-text-dim">Secure institutional access only</span>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-4 rounded-lg bg-danger/8 border border-danger/20 px-4 py-2.5 text-xs text-danger">
              {error}
            </div>
          )}

          {/* ── Admin/Teacher tab ── */}
          {tab === "admin" && (
            <form onSubmit={handleEmailLogin} className="flex flex-col gap-3.5">
              <Input
                label="Institute"
                placeholder="demo"
                suffix=".canop.app"
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
                autoComplete="organization"
              />
              <Input
                label="Email"
                type="email"
                placeholder="you@institute.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />

              <div className="h-1" />
              <Button type="submit" fullWidth loading={isLoading}>
                Sign in →
              </Button>

              <div className="flex items-center gap-3 my-2 text-text-dim">
                <div className="flex-1 h-px bg-border-soft" />
                <span className="font-mono text-2xs uppercase tracking-widest">or</span>
                <div className="flex-1 h-px bg-border-soft" />
              </div>

              <div className="relative group">
                <Button type="button" variant="secondary" fullWidth disabled>
                  Continue with Google
                </Button>
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-[#1a1717] text-white text-2xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  Coming soon
                </div>
              </div>

              <button
                type="button"
                className="mt-2 text-xs text-indigo font-medium hover:underline self-start"
                onClick={() => {
                  /* TODO: Session 3 forgot password modal */
                }}
              >
                Forgot password?
              </button>
            </form>
          )}

          {/* ── Student/Parent tab ── */}
          {tab === "student" && !otpSent && (
            <form onSubmit={handleSendOtp} className="flex flex-col gap-3.5">
              <Input
                label="Institute"
                placeholder="demo"
                suffix=".canop.app"
                value={studentSlug}
                onChange={(e) => setStudentSlug(e.target.value)}
                autoComplete="organization"
              />
              <div className="w-full">
                <label className="mb-1.5 block text-xs font-medium text-text-muted">
                  Phone number
                </label>
                <div className="flex gap-2">
                  <div className="flex items-center rounded-md border border-border-soft bg-white/92 px-3 text-sm text-text-muted min-w-[60px] justify-center">
                    +91
                  </div>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    autoComplete="tel"
                    className={cn(
                      "flex-1 rounded-md border border-border-soft bg-white/92 px-3.5 py-2.5",
                      "text-sm text-text-primary placeholder:text-text-dim",
                      "outline-none transition-all duration-base ease-glass",
                      "focus:border-indigo focus:ring-2 focus:ring-indigo/15",
                    )}
                  />
                </div>
              </div>

              <div className="h-1" />
              <Button type="submit" fullWidth loading={isLoading}>
                Send OTP
              </Button>
            </form>
          )}

          {/* ── OTP verification ── */}
          {tab === "student" && otpSent && (
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
              <p className="text-sm text-text-body text-center">
                OTP sent to <strong className="font-mono">{maskedPhone}</strong>
              </p>

              <OTPInput value={otp} onChange={setOtp} disabled={isLoading} />

              <Button type="submit" fullWidth loading={isLoading}>
                Verify and sign in
              </Button>

              <div className="text-center">
                {resendCooldown > 0 ? (
                  <span className="text-xs text-text-dim">
                    Didn&apos;t receive it? Resend in {resendCooldown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    className="text-xs text-indigo font-medium hover:underline"
                    onClick={() => handleSendOtp()}
                  >
                    Resend OTP
                  </button>
                )}
              </div>

              <button
                type="button"
                className="text-xs text-text-muted hover:text-text-body self-center"
                onClick={() => { setOtpSent(false); setOtp(""); setError(""); }}
              >
                ← Change phone number
              </button>
            </form>
          )}

        {/* Footer link */}
        <div className="mt-8 text-center">
          <a href="/signup" className="text-xs text-indigo font-medium hover:underline">
            New institute? Request a demo →
          </a>
        </div>
      </div>
    </div>
  );
}
