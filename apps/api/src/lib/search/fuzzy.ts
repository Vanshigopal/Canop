import Fuse from "fuse.js";

/**
 * A1 — Create a Fuse instance.
 * threshold 0.35 — tolerates 1-2 typos on short names; stricter than default.
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
