import { useCallback, useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { api } from "@/lib/api";
import { Empty, SectionHeader } from "@/components/portal/PortalPrimitives";
import { GradesView } from "../student/GradesView";
import type { GradebookData } from "../student/StudentGrades";
import { ChildSwitcher } from "./ChildSwitcher";
import { useSelectedChild } from "./useSelectedChild";

export function ParentGrades() {
  const { children, selectedId, select, loading: childrenLoading } = useSelectedChild();
  const [data, setData] = useState<GradebookData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/api/v1/parent/children/${selectedId}/grades`);
      setData(data.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    load();
  }, [load]);

  useSocket("marks:published", load);
  useSocket("exam:published", load);

  if (childrenLoading) return null;

  if (!children || children.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <SectionHeader title="Grades" />
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
      <GradesView gradebook={data} loading={loading} />
    </div>
  );
}
