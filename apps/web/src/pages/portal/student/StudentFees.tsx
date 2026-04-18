import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import { api } from "@/lib/api";
import { FeesView } from "./FeesView";
import type { StudentFeeRecord } from "@/components/portal/portal-types";

interface Props {
  studentId?: string; // when provided, parent view
  studentName?: string;
}

export function StudentFees({ studentId, studentName }: Props) {
  const { user } = useAuth();
  const [studentIdResolved, setStudentIdResolved] = useState<string | null>(
    studentId ?? null,
  );
  const [fees, setFees] = useState<StudentFeeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const resolveStudentId = useCallback(async () => {
    if (studentId) {
      setStudentIdResolved(studentId);
      return studentId;
    }
    const { data } = await api.get("/api/v1/student/profile");
    setStudentIdResolved(data.data.id);
    return data.data.id as string;
  }, [studentId]);

  const loadFees = useCallback(async () => {
    try {
      const id = studentIdResolved ?? (await resolveStudentId());
      const { data } = await api.get(`/api/v1/student-fees/${id}`);
      setFees(data.data ?? []);
    } catch {
      setFees([]);
    } finally {
      setLoading(false);
    }
  }, [studentIdResolved, resolveStudentId]);

  useEffect(() => {
    loadFees();
  }, [loadFees]);

  useSocket("payment:received", loadFees);
  useSocket("fee:assigned", loadFees);

  return (
    <FeesView
      fees={fees}
      loading={loading}
      studentName={studentName ?? user?.name ?? "Student"}
      userEmail={null}
      userPhone={user?.phone ?? null}
      onRefresh={loadFees}
    />
  );
}
