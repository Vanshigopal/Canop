/**
 * Tiny pure statistics helpers — used by algorithms that don't
 * need the full simple-statistics surface.
 */

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance =
    values.reduce((acc, v) => acc + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length)));
  return (sorted[idx] as number) ?? 0;
}

export function percentileRank(value: number, values: number[]): number {
  if (values.length === 0) return 0;
  const below = values.filter((v) => v < value).length;
  const equal = values.filter((v) => v === value).length;
  return ((below + 0.5 * equal) / values.length) * 100;
}
