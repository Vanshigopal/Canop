export interface GradeBracket {
  min: number;
  grade: string;
}

export const GRADE_BRACKETS: GradeBracket[] = [
  { min: 90, grade: "A+" },
  { min: 80, grade: "A" },
  { min: 70, grade: "B+" },
  { min: 60, grade: "B" },
  { min: 50, grade: "C" },
  { min: 40, grade: "D" },
  { min: 0, grade: "F" },
];

export function gradeFromPercent(percent: number): string {
  for (const b of GRADE_BRACKETS) {
    if (percent >= b.min) return b.grade;
  }
  return "F";
}

export type TrendDirection = "up" | "down" | "stable";

export const TREND_THRESHOLD = 5;

export function trendFromDelta(currentPct: number, previousPct: number): TrendDirection {
  const delta = currentPct - previousPct;
  if (delta >= TREND_THRESHOLD) return "up";
  if (delta <= -TREND_THRESHOLD) return "down";
  return "stable";
}

export function distributionBuckets(
  totalMarks: number,
): Array<{ from: number; to: number; label: string }> {
  const step = Math.max(50, Math.ceil(totalMarks / 7 / 10) * 10);
  const out: Array<{ from: number; to: number; label: string }> = [];
  let from = 0;
  while (from < totalMarks) {
    const to = Math.min(from + step, totalMarks);
    const label = from === 0 ? `0-${to}` : `${from + 1}-${to}`;
    out.push({ from: from === 0 ? 0 : from + 1, to, label });
    from = to;
  }
  return out;
}
