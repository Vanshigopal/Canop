/**
 * H3 — Standardized severity color coding.
 * Classifies a metric into 5 severity levels for consistent UI coloring.
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

export const SEVERITY_COLORS: Record<Severity, { bg: string; text: string; border: string }> = {
  excellent: { bg: "#DCFCE7", text: "#15803D", border: "#BBF7D0" },
  good:      { bg: "#DBEAFE", text: "#1D4ED8", border: "#BFDBFE" },
  neutral:   { bg: "#F1EFE8", text: "#5F5E5A", border: "#D3D1C7" },
  warning:   { bg: "#FEF3C7", text: "#854F0B", border: "#FCD34D" },
  critical:  { bg: "#FEE2E2", text: "#B91C1C", border: "#FECACA" },
};
