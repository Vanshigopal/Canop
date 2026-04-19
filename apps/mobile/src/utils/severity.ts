// React Native mirror of apps/web/src/lib/severity.ts.
// Returns hex colors instead of Tailwind classes since RN can't do CSS.

import { MD3 } from '@/config/theme';

export type Severity = 'excellent' | 'good' | 'neutral' | 'warning' | 'critical';

export function attendanceSeverity(percent: number): Severity {
  if (percent >= 90) return 'excellent';
  if (percent >= 80) return 'good';
  if (percent >= 70) return 'neutral';
  if (percent >= 60) return 'warning';
  return 'critical';
}

export function marksSeverity(percent: number, cutOff: number): Severity {
  const margin = percent - cutOff;
  if (margin >= 30) return 'excellent';
  if (margin >= 15) return 'good';
  if (margin >= 0) return 'neutral';
  if (margin >= -10) return 'warning';
  return 'critical';
}

export function feeSeverity(daysOverdue: number): Severity {
  if (daysOverdue <= 0) return 'excellent';
  if (daysOverdue <= 3) return 'neutral';
  if (daysOverdue <= 14) return 'warning';
  return 'critical';
}

export function engagementSeverity(score: number): Severity {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 55) return 'neutral';
  if (score >= 40) return 'warning';
  return 'critical';
}

export const SEVERITY_COLORS: Record<
  Severity,
  { bg: string; text: string; border: string }
> = {
  excellent: {
    bg: MD3.colors.successContainer,
    text: MD3.colors.onSuccessContainer,
    border: MD3.colors.success,
  },
  good: {
    bg: MD3.colors.infoContainer,
    text: MD3.colors.onInfoContainer,
    border: MD3.colors.info,
  },
  neutral: {
    bg: MD3.colors.surfaceVariant,
    text: MD3.colors.onSurfaceVariant,
    border: MD3.colors.outlineVariant,
  },
  warning: {
    bg: MD3.colors.warningContainer,
    text: MD3.colors.onWarningContainer,
    border: MD3.colors.warning,
  },
  critical: {
    bg: MD3.colors.errorContainer,
    text: MD3.colors.onErrorContainer,
    border: MD3.colors.error,
  },
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  excellent: 'Excellent',
  good: 'Good',
  neutral: 'Average',
  warning: 'Warning',
  critical: 'Critical',
};
