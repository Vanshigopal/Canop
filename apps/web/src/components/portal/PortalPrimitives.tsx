import { cn } from "@raquel/ui";
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

interface PortalCardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
  accent?: "indigo" | "coral" | "amber" | "emerald" | "rose" | null;
}

const ACCENT_BAR: Record<NonNullable<PortalCardProps["accent"]>, string> = {
  indigo: "#4F46E5",
  coral: "#EC4899",
  amber: "#F59E0B",
  emerald: "#10B981",
  rose: "#F43F5E",
};

export function PortalCard({
  className,
  padded = true,
  accent = null,
  style,
  children,
  ...rest
}: PortalCardProps) {
  const merged: CSSProperties = {
    ...(accent ? { borderLeft: `4px solid ${ACCENT_BAR[accent]}` } : {}),
    ...style,
  };
  return (
    <div
      className={cn("glass-panel", padded && "p-5", className)}
      style={merged}
      {...rest}
    >
      {children}
    </div>
  );
}

export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex items-end justify-between mb-2">
      <h2
        className="text-[15px] font-medium"
        style={{ fontFamily: "Fraunces, serif", color: "#2C2C2A" }}
      >
        {title}
      </h2>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="text-xs font-medium px-2 py-1"
          style={{ color: "#4F46E5", minHeight: 44, minWidth: 44 }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

type AttendanceBadgeStatus =
  | "PRESENT"
  | "ABSENT"
  | "LATE"
  | "EXCUSED"
  | "PENDING";

const ATTENDANCE_PALETTE: Record<
  AttendanceBadgeStatus,
  { bg: string; fg: string; label: string }
> = {
  PRESENT: { bg: "#DCFCE7", fg: "#14532D", label: "Present" },
  ABSENT: { bg: "#FEE2E2", fg: "#7F1D1D", label: "Absent" },
  LATE: { bg: "#FEF3C7", fg: "#78350F", label: "Late" },
  EXCUSED: { bg: "#E0E7FF", fg: "#312E81", label: "Excused" },
  PENDING: { bg: "#F1EFE8", fg: "#5F5E5A", label: "Pending" },
};

export function AttendanceBadge({ status }: { status: string }) {
  const key = (status as AttendanceBadgeStatus) in ATTENDANCE_PALETTE
    ? (status as AttendanceBadgeStatus)
    : "PENDING";
  const p = ATTENDANCE_PALETTE[key];
  return (
    <span
      className="inline-flex items-center px-2.5 h-7 rounded-full text-xs font-semibold"
      style={{ backgroundColor: p.bg, color: p.fg }}
    >
      {p.label}
    </span>
  );
}

type SubmissionBadgeStatus =
  | "NOT_OPENED"
  | "OPENED"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "LATE_SUBMITTED"
  | "GRADED"
  | "MISSED";

const SUBMISSION_PALETTE: Record<
  SubmissionBadgeStatus,
  { bg: string; fg: string; label: string }
> = {
  NOT_OPENED: { bg: "#F1EFE8", fg: "#5F5E5A", label: "New" },
  OPENED: { bg: "#DBEAFE", fg: "#1E3A8A", label: "Opened" },
  IN_PROGRESS: { bg: "#FEF3C7", fg: "#78350F", label: "Drafting" },
  SUBMITTED: { bg: "#DCFCE7", fg: "#14532D", label: "Submitted" },
  LATE_SUBMITTED: { bg: "#FEF3C7", fg: "#78350F", label: "Late" },
  GRADED: { bg: "#E0E7FF", fg: "#312E81", label: "Graded" },
  MISSED: { bg: "#FEE2E2", fg: "#7F1D1D", label: "Missed" },
};

export function SubmissionBadge({ status }: { status: string }) {
  const key = (status as SubmissionBadgeStatus) in SUBMISSION_PALETTE
    ? (status as SubmissionBadgeStatus)
    : "NOT_OPENED";
  const p = SUBMISSION_PALETTE[key];
  return (
    <span
      className="inline-flex items-center px-2.5 h-7 rounded-full text-[11px] font-semibold uppercase tracking-wide"
      style={{ backgroundColor: p.bg, color: p.fg }}
    >
      {p.label}
    </span>
  );
}

export function DateCountdown({ to }: { to: string | Date }) {
  const target = typeof to === "string" ? new Date(to) : to;
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
  const diffHours = Math.round(diffMs / (60 * 60 * 1000));

  let label: string;
  let tone: "neutral" | "warn" | "danger" | "success";
  if (diffMs < 0) {
    const overdueDays = Math.abs(diffDays);
    label = overdueDays === 0 ? "Overdue" : `Overdue ${overdueDays}d`;
    tone = "danger";
  } else if (diffHours <= 12) {
    label = diffHours <= 0 ? "Due now" : `${diffHours}h left`;
    tone = "danger";
  } else if (diffDays <= 1) {
    label = "Due tomorrow";
    tone = "warn";
  } else if (diffDays <= 3) {
    label = `${diffDays}d left`;
    tone = "warn";
  } else if (diffDays <= 7) {
    label = `${diffDays}d left`;
    tone = "neutral";
  } else {
    label = target.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
    tone = "success";
  }

  const palette = {
    neutral: { bg: "#F1EFE8", fg: "#5F5E5A" },
    warn: { bg: "#FEF3C7", fg: "#78350F" },
    danger: { bg: "#FEE2E2", fg: "#7F1D1D" },
    success: { bg: "#DCFCE7", fg: "#14532D" },
  }[tone];

  return (
    <span
      className="inline-flex items-center px-2.5 h-6 rounded-full text-[11px] font-semibold"
      style={{ backgroundColor: palette.bg, color: palette.fg }}
    >
      {label}
    </span>
  );
}

export function PortalSkeleton({ height = 80 }: { height?: number }) {
  return (
    <div className="glass-panel animate-pulse" style={{ height, padding: 16 }}>
      <div className="w-1/3 h-3 mb-3 rounded" style={{ backgroundColor: "#E8E3DA" }} />
      <div className="w-2/3 h-5 rounded" style={{ backgroundColor: "#E8E3DA" }} />
    </div>
  );
}

export function Empty({
  icon,
  title,
  body,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
}) {
  return (
    <div
      className="glass-panel flex flex-col items-center justify-center text-center py-10 px-6"
      style={{ minHeight: 180 }}
    >
      {icon && (
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
          style={{ backgroundColor: "#E8E3DA", color: "#5F5E5A" }}
        >
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold" style={{ color: "#2C2C2A" }}>
        {title}
      </p>
      {body && (
        <p className="text-xs mt-1" style={{ color: "#6B6A66" }}>
          {body}
        </p>
      )}
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  className,
  fullWidth,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  fullWidth?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
        fullWidth && "w-full",
        className,
      )}
      style={{
        background: "linear-gradient(135deg, #4F46E5, #3730A3)",
        boxShadow: "0 6px 18px rgba(79, 70, 229, 0.25)",
        minHeight: 48,
      }}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  disabled,
  className,
  fullWidth,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  fullWidth?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full text-sm font-semibold border transition-transform active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
        fullWidth && "w-full",
        className,
      )}
      style={{
        backgroundColor: "#FFFFFF",
        color: "#2C2C2A",
        borderColor: "rgba(90, 70, 50, 0.15)",
        minHeight: 48,
      }}
    >
      {children}
    </button>
  );
}

export function greetingByTime() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function formatRelativeDate(to: string | Date) {
  const target = typeof to === "string" ? new Date(to) : to;
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  if (diffDays === -1) return "yesterday";
  if (diffDays > 0 && diffDays <= 7) return `in ${diffDays} days`;
  if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
  return target.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function severityColor(pct: number | null): string {
  if (pct === null) return "#5F5E5A";
  if (pct >= 85) return "#10B981";
  if (pct >= 75) return "#2563EB";
  if (pct >= 60) return "#F59E0B";
  return "#DC2626";
}
