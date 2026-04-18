import { useCallback, useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { api } from "@/lib/api";
import {
  Empty,
  PortalSkeleton,
  SectionHeader,
} from "@/components/portal/PortalPrimitives";
import type { DashboardSnapshot } from "@/components/portal/portal-types";
import { DashboardCore } from "../student/DashboardCore";
import { ChildSwitcher } from "./ChildSwitcher";
import { useSelectedChild } from "./useSelectedChild";

export function ParentDashboard() {
  const { children, selectedId, select, loading: childrenLoading } =
    useSelectedChild();
  const [dashboard, setDashboard] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!selectedId) return;
    try {
      const { data } = await api.get(
        `/api/v1/parent/children/${selectedId}/dashboard`,
      );
      setDashboard(data.data);
    } catch {
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    load();
  }, [load]);

  useSocket("attendance:marked", load);
  useSocket("payment:received", load);
  useSocket("submission:graded", load);
  useSocket("exam:published", load);
  useSocket("broadcast:sent", load);

  if (childrenLoading) {
    return (
      <div className="flex flex-col gap-4">
        <PortalSkeleton height={52} />
        <PortalSkeleton height={140} />
      </div>
    );
  }

  if (!children || children.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <SectionHeader title="Home" />
        <Empty
          title="No children linked yet"
          body="Contact your institute to link your account to a student."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {children.length > 1 && (
        <ChildSwitcher
          children={children}
          selectedId={selectedId}
          onChange={select}
        />
      )}
      <DashboardCore
        dashboard={dashboard}
        loading={loading}
        navPrefix="/portal/parent"
      />
    </div>
  );
}
