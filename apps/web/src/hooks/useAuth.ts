import { useAuthStore } from "@/stores/auth";

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const permissions = useAuthStore((s) => s.permissions);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);
  return { user, tenant, permissions, isAuthenticated, logout };
}
