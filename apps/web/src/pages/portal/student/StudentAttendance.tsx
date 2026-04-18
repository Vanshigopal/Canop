import { useCallback, useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { api } from "@/lib/api";
import { AttendanceView } from "./AttendanceView";
import type { AttendanceCalendar } from "@/components/portal/portal-types";

function todayMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function StudentAttendance() {
  const [month, setMonth] = useState(todayMonth());
  const [data, setData] = useState<AttendanceCalendar | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/v1/student/attendance-calendar?month=${month}`);
      setData(res.data.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  useSocket("attendance:marked", load);

  return (
    <AttendanceView
      data={data}
      loading={loading}
      month={month}
      onMonthChange={setMonth}
    />
  );
}
