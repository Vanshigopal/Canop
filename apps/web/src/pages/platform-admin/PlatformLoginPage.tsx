import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { usePlatformAuth } from "@/stores/platform-auth";

export function PlatformLoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading } = usePlatformAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) {
    return <Navigate to="/platform-admin" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      navigate("/platform-admin");
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message ?? "Login failed. Please try again.",
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A1A] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <ShieldCheck className="w-8 h-8 text-blue-400" />
            <span className="text-2xl font-semibold tracking-tight">CANOP</span>
          </div>
          <div className="text-xs text-blue-300 uppercase tracking-[0.2em]">
            Platform Administration
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[#1A1A2E] border border-white/10 rounded-lg p-6 shadow-2xl"
        >
          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs uppercase tracking-wider text-gray-400 mb-1.5"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#0A0A1A] border border-white/10 rounded-md text-sm focus:outline-none focus:border-blue-400"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs uppercase tracking-wider text-gray-400 mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#0A0A1A] border border-white/10 rounded-md text-sm focus:outline-none focus:border-blue-400"
              />
            </div>

            {error && (
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-md font-medium text-sm transition-colors"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>

        <div className="text-center mt-6 text-xs text-gray-500">
          Authorized access only. All actions are logged.
        </div>
      </div>
    </div>
  );
}
