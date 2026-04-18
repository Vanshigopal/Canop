import { useCallback, useEffect, useState } from "react";

const STORAGE_PREFIX = "raquel:recent:";
const MAX_ITEMS = 20;

interface RecentItem {
  id: string;
  viewedAt: number;
}

/**
 * A2 — Local recent-items tracking (per entity type).
 * Complements server-side RecentItem — updated immediately on navigation
 * so offline/slow paths still rank recent items well.
 */
export function useRecentItems(entityType: string) {
  const [items, setItems] = useState<RecentItem[]>(() => load(entityType));

  useEffect(() => {
    setItems(load(entityType));
  }, [entityType]);

  const track = useCallback(
    (id: string) => {
      const current = load(entityType);
      const filtered = current.filter((r) => r.id !== id);
      filtered.unshift({ id, viewedAt: Date.now() });
      const capped = filtered.slice(0, MAX_ITEMS);
      localStorage.setItem(STORAGE_PREFIX + entityType, JSON.stringify(capped));
      setItems(capped);
    },
    [entityType],
  );

  return { items, recentIds: items.map((r) => r.id), track };
}

function load(entityType: string): RecentItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + entityType);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((r) => r && typeof r.id === "string");
  } catch {
    return [];
  }
}
