import { useCallback, useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { api } from "@/lib/api";
import { DashboardCore } from "./DashboardCore";
import type { DashboardSnapshot } from "@/components/portal/portal-types";

export function StudentDashboard() {
  const [dashboard, setDashboard] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/api/v1/student/dashboard");
      setDashboard(data.data);
    } catch {
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useSocket("attendance:marked", load);
  useSocket("payment:received", load);
  useSocket("submission:graded", load);
  useSocket("exam:published", load);
  useSocket("broadcast:sent", load);

  return (
    <DashboardCore
      dashboard={dashboard}
      loading={loading}
      navPrefix="/portal/student"
    />
  );
}
