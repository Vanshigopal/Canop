import {
  format,
  formatDistanceToNow,
  isToday,
  isTomorrow,
  isYesterday,
  parseISO,
} from 'date-fns';

function asDate(value: string | Date): Date {
  return value instanceof Date ? value : parseISO(value);
}

export function formatDate(value: string | Date, pattern = 'd MMM yyyy'): string {
  return format(asDate(value), pattern);
}

export function formatTime(value: string | Date): string {
  return format(asDate(value), 'h:mm a');
}

export function formatDateTime(value: string | Date): string {
  return format(asDate(value), "d MMM, h:mm a");
}

export function formatRelativeDate(value: string | Date): string {
  const d = asDate(value);
  if (isToday(d)) return `Today, ${formatTime(d)}`;
  if (isTomorrow(d)) return `Tomorrow, ${formatTime(d)}`;
  if (isYesterday(d)) return `Yesterday, ${formatTime(d)}`;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function isOverdue(deadline: string | Date): boolean {
  return asDate(deadline).getTime() < Date.now();
}
