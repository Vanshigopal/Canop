import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
import { AdminDashboard } from "./AdminDashboard";
import { TeacherDashboard } from "./TeacherDashboard";

export function DashboardRouter() {
  const role = useAuthStore((s) => s.user?.role);

  if (role === "STUDENT") return <Navigate to="/portal/student" replace />;
  if (role === "PARENT") return <Navigate to="/portal/parent" replace />;
  if (role === "TEACHER") return <TeacherDashboard />;
  return <AdminDashboard />;
}
