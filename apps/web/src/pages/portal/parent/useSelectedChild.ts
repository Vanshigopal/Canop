import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { ChildSummary } from "@/components/portal/portal-types";

const STORAGE_KEY = "canop:parent:selected-child";

export function useSelectedChild() {
  const [children, setChildren] = useState<ChildSummary[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(STORAGE_KEY);
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/api/v1/parent/children");
      setChildren(data.data ?? []);
    } catch {
      setChildren([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!children || children.length === 0) return;
    if (!selectedId || !children.some((c) => c.id === selectedId)) {
      const first = children[0]!.id;
      setSelectedId(first);
      localStorage.setItem(STORAGE_KEY, first);
    }
  }, [children, selectedId]);

  const select = useCallback((id: string) => {
    setSelectedId(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const selected = children?.find((c) => c.id === selectedId) ?? null;

  return { children, selected, selectedId, select, loading };
}
