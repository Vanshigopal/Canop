/**
 * H3 — Severity color coding (frontend mirror).
 */
export type Severity = "excellent" | "good" | "neutral" | "warning" | "critical";

export function attendanceSeverity(percent: number): Severity {
  if (percent >= 90) return "excellent";
  if (percent >= 80) return "good";
  if (percent >= 70) return "neutral";
  if (percent >= 60) return "warning";
  return "critical";
}

export function marksSeverity(percent: number, cutOff: number): Severity {
  const margin = percent - cutOff;
  if (margin >= 30) return "excellent";
  if (margin >= 15) return "good";
  if (margin >= 0) return "neutral";
  if (margin >= -10) return "warning";
  return "critical";
}

export function feeSeverity(daysOverdue: number): Severity {
  if (daysOverdue <= 0) return "excellent";
  if (daysOverdue <= 3) return "neutral";
  if (daysOverdue <= 14) return "warning";
  return "critical";
}

export function engagementSeverity(score: number): Severity {
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 55) return "neutral";
  if (score >= 40) return "warning";
  return "critical";
}

export function riskSeverity(riskScore: number): Severity {
  if (riskScore >= 75) return "critical";
  if (riskScore >= 55) return "warning";
  if (riskScore >= 35) return "neutral";
  if (riskScore >= 15) return "good";
  return "excellent";
}

/**
 * Tailwind class tokens for Severity. Keyed to Nordic Glass pastel palette.
 */
export const SEVERITY_CLASSES: Record<Severity, string> = {
  excellent: "bg-emerald-100 text-emerald-800 border-emerald-200",
  good: "bg-blue-100 text-blue-800 border-blue-200",
  neutral: "bg-[#F1EFE8] text-[#5F5E5A] border-[#D3D1C7]",
  warning: "bg-amber-100 text-amber-800 border-amber-200",
  critical: "bg-red-100 text-red-800 border-red-200",
};

export const SEVERITY_BADGE_TONE: Record<Severity, "success" | "info" | "neutral" | "warning" | "danger"> = {
  excellent: "success",
  good: "info",
  neutral: "neutral",
  warning: "warning",
  critical: "danger",
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  excellent: "Excellent",
  good: "Good",
  neutral: "Average",
  warning: "Warning",
  critical: "Critical",
};
