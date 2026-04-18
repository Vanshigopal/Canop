import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import { api } from "@/lib/api";
import { Empty, SectionHeader } from "@/components/portal/PortalPrimitives";
import type { StudentFeeRecord } from "@/components/portal/portal-types";
import { FeesView } from "../student/FeesView";
import { ChildSwitcher } from "./ChildSwitcher";
import { useSelectedChild } from "./useSelectedChild";

export function ParentFees() {
  const { user } = useAuth();
  const { children, selected, selectedId, select, loading: childrenLoading } =
    useSelectedChild();
  const [fees, setFees] = useState<StudentFeeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!selectedId) return;
    try {
      const { data } = await api.get(`/api/v1/student-fees/${selectedId}`);
      setFees(data.data ?? []);
    } catch {
      setFees([]);
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    load();
  }, [load]);

  useSocket("payment:received", load);
  useSocket("fee:assigned", load);

  if (childrenLoading) return null;

  if (!children || children.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <SectionHeader title="Fees" />
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
      <FeesView
        fees={fees}
        loading={loading}
        studentName={selected?.name ?? ""}
        userEmail={null}
        userPhone={user?.phone ?? null}
        onRefresh={load}
      />
    </div>
  );
}
