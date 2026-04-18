import Fuse from "fuse.js";

/**
 * A1 — Client-side fuzzy search (mirror of api/src/lib/search/fuzzy.ts).
 */
export function createFuzzySearcher<T>(items: T[], keys: Array<keyof T | string>) {
  return new Fuse(items, {
    keys: keys as string[],
    threshold: 0.35,
    ignoreLocation: true,
    includeScore: true,
    minMatchCharLength: 2,
  });
}

export function fuzzySearch<T>(
  items: T[],
  query: string,
  keys: Array<keyof T | string>,
  limit = 20,
): T[] {
  if (!query.trim()) return items.slice(0, limit);
  const fuse = createFuzzySearcher(items, keys);
  return fuse
    .search(query)
    .slice(0, limit)
    .map((r) => r.item);
}

/**
 * Boost recently-viewed items to the top of a result set.
 */
export function applyRecencyBoost<T extends { id: string }>(
  items: T[],
  recentIds: string[],
): T[] {
  const recencyIndex = new Map(recentIds.map((id, idx) => [id, idx]));
  const tagged = items.map((item, origIdx) => ({
    item,
    recentIdx: recencyIndex.get(item.id) ?? 999,
    origIdx,
  }));
  tagged.sort((a, b) => {
    if (a.recentIdx !== b.recentIdx) return a.recentIdx - b.recentIdx;
    return a.origIdx - b.origIdx;
  });
  return tagged.map((t) => t.item);
}
