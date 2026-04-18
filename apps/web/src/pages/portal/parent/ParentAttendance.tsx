import { useCallback, useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { api } from "@/lib/api";
import { Empty, SectionHeader } from "@/components/portal/PortalPrimitives";
import type { AttendanceCalendar } from "@/components/portal/portal-types";
import { AttendanceView } from "../student/AttendanceView";
import { ChildSwitcher } from "./ChildSwitcher";
import { useSelectedChild } from "./useSelectedChild";

function todayMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function ParentAttendance() {
  const { children, selectedId, select, loading: childrenLoading } = useSelectedChild();
  const [month, setMonth] = useState(todayMonth());
  const [data, setData] = useState<AttendanceCalendar | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      const { data } = await api.get(
        `/api/v1/parent/children/${selectedId}/attendance-calendar?month=${month}`,
      );
      setData(data.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedId, month]);

  useEffect(() => {
    load();
  }, [load]);

  useSocket("attendance:marked", load);

  if (childrenLoading) return null;

  if (!children || children.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <SectionHeader title="Classes" />
        <Empty title="No children linked" />
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
      <AttendanceView
        data={data}
        loading={loading}
        month={month}
        onMonthChange={setMonth}
      />
    </div>
  );
}
