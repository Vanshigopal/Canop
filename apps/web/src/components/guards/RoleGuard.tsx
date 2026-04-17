import { type ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";

interface RoleGuardProps {
  roles: string[];
  children: ReactNode;
}

const ROLE_REDIRECT: Record<string, string> = {
  ADMIN: "/dashboard",
  TEACHER: "/dashboard",
  STUDENT: "/portal",
  PARENT: "/parent",
};

export function RoleGuard({ roles, children }: RoleGuardProps) {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !roles.includes(user.role)) {
      const redirect = ROLE_REDIRECT[user.role] || "/login";
      navigate(redirect, { replace: true });
    }
  }, [user, roles, navigate]);

  if (!user || !roles.includes(user.role)) return null;
  return <>{children}</>;
}
