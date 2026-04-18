import { Badge, Button } from "@/components/primitives";
import { Calendar, CheckCircle2, UserX, XCircle } from "lucide-react";
import type { RetestRow, RetestStatus } from "./RetestsPage";

const STATUS_TONE: Record<
  RetestStatus,
  "neutral" | "warning" | "info" | "accent" | "success" | "danger"
> = {
  PENDING_SCHEDULE: "warning",
  SCHEDULED: "info",
  COMPLETED: "success",
  NO_SHOW: "danger",
  CANCELLED: "neutral",
};

const STATUS_LABEL: Record<RetestStatus, string> = {
  PENDING_SCHEDULE: "PENDING",
  SCHEDULED: "SCHEDULED",
  COMPLETED: "COMPLETED",
  NO_SHOW: "NO-SHOW",
  CANCELLED: "CANCELLED",
};

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function fmtTime12h(t: string | null): string {
  if (!t) return "—";
  const [hStr, m] = t.split(":");
  const h = Number(hStr);
  const suffix = h >= 12 ? "PM" : "AM";
  const hh = h % 12 || 12;
  return `${hh}:${m} ${suffix}`;
}

function failedBy(
  cutOff: number,
  cutOffType: "MARKS" | "PERCENTAGE",
  marks: number,
  pct: number,
): string {
  const gap = cutOffType === "MARKS" ? cutOff - marks : cutOff - pct;
  const unit = cutOffType === "MARKS" ? "marks" : "%";
  return `${gap.toFixed(1)} ${unit}`;
}

interface Props {
  retest: RetestRow;
  onSchedule: () => void;
  onReschedule: () => void;
  onMarkAttended: () => void;
  onNoShow: () => void;
  onCancel: () => void;
  onEnterMarks: () => void;
}

export function RetestCard({
  retest: r,
  onSchedule,
  onReschedule,
  onMarkAttended,
  onNoShow,
  onCancel,
  onEnterMarks,
}: Props) {
  const cutOffLabel =
    r.cutOffType === "MARKS" ? `${Number(r.cutOff)} marks` : `${Number(r.cutOff)}%`;

  return (
    <div className="glass-panel p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-display text-base text-text-primary">
            {r.student.user.name}
            {r.student.rollNumber && (
              <span className="text-text-muted text-xs font-mono ml-2">
                · {r.student.rollNumber}
              </span>
            )}
          </div>
          <div className="text-xs text-text-muted mt-0.5">
            {r.exam.name}
            {r.exam.examDate && (
              <span className="text-text-dim"> · {fmtDate(r.exam.examDate)}</span>
            )}
          </div>
        </div>
        <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
      </div>

      {r.status === "COMPLETED" && r.retestMarks != null ? (
        <div className="flex items-center gap-3 text-sm">
          <div className="flex-1 rounded-md bg-danger/5 border border-danger/15 p-3">
            <div className="text-2xs uppercase tracking-wider text-text-dim">Original</div>
            <div className="text-text-primary font-semibold mt-1">
              {r.originalMarks}/{r.exam.totalMarks}{" "}
              <span className="text-text-muted font-normal">({r.originalPercentage}%)</span>
              <XCircle size={14} className="inline ml-1.5 text-danger" />
            </div>
          </div>
          <div className="text-text-dim text-sm">→</div>
          <div
            className={`flex-1 rounded-md p-3 border ${
              r.retestIsPassed ? "bg-success/5 border-success/20" : "bg-danger/5 border-danger/15"
            }`}
          >
            <div className="text-2xs uppercase tracking-wider text-text-dim">Retest</div>
            <div className="text-text-primary font-semibold mt-1">
              {r.retestMarks}/{r.exam.totalMarks}{" "}
              <span className="text-text-muted font-normal">({r.retestPercentage}%)</span>
              {r.retestIsPassed ? (
                <CheckCircle2 size={14} className="inline ml-1.5 text-success" />
              ) : (
                <XCircle size={14} className="inline ml-1.5 text-danger" />
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <div className="text-2xs uppercase tracking-wider text-text-dim">Original</div>
            <div className="text-text-primary">
              {r.originalMarks}/{r.exam.totalMarks}{" "}
              <span className="text-text-muted">({r.originalPercentage}%)</span>
            </div>
          </div>
          <div>
            <div className="text-2xs uppercase tracking-wider text-text-dim">Cut-off</div>
            <div className="text-text-primary">{cutOffLabel}</div>
          </div>
        </div>
      )}

      {r.status === "PENDING_SCHEDULE" && (
        <div className="text-xs text-text-muted">
          Failed by{" "}
          <span className="text-danger font-medium">
            {failedBy(
              Number(r.cutOff),
              r.cutOffType,
              Number(r.originalMarks),
              Number(r.originalPercentage),
            )}
          </span>
        </div>
      )}

      {r.status === "SCHEDULED" && (
        <div className="text-xs text-text-muted space-y-0.5">
          <div className="inline-flex items-center gap-1.5">
            <Calendar size={12} /> Retest: {fmtDate(r.scheduledDate)} at{" "}
            {fmtTime12h(r.scheduledTime)}
          </div>
          {r.confirmedBy && <div className="text-text-dim">Confirmed by: {r.confirmedBy.name}</div>}
          {r.attendedAt && (
            <div className="text-success">
              Attended at{" "}
              {new Date(r.attendedAt).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          )}
        </div>
      )}

      {r.status === "COMPLETED" && (
        <div className="text-2xs text-text-dim">
          Retested on {fmtDate(r.scheduledDate)}
          {r.attendedAt && (
            <span>
              {" "}
              · Attended at{" "}
              {new Date(r.attendedAt).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
          <div className="mt-1 text-text-muted">Original grade and batch rank unchanged.</div>
        </div>
      )}

      {r.status === "NO_SHOW" && (
        <div className="text-xs text-danger">
          <UserX size={12} className="inline mr-1" />
          Was scheduled: {fmtDate(r.scheduledDate)} at {fmtTime12h(r.scheduledTime)}
        </div>
      )}

      {r.status === "CANCELLED" && r.note && (
        <div className="text-xs text-text-dim">Note: {r.note}</div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        {r.status === "PENDING_SCHEDULE" && (
          <>
            <Button variant="primary" size="sm" onClick={onSchedule}>
              Set Date & Time
            </Button>
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          </>
        )}
        {r.status === "SCHEDULED" && !r.attendedAt && (
          <>
            <Button variant="primary" size="sm" onClick={onMarkAttended}>
              Mark Attended
            </Button>
            <Button variant="secondary" size="sm" onClick={onNoShow}>
              No-Show
            </Button>
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          </>
        )}
        {r.status === "SCHEDULED" && r.attendedAt && (
          <>
            <Button variant="primary" size="sm" onClick={onEnterMarks}>
              Enter Marks
            </Button>
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          </>
        )}
        {r.status === "NO_SHOW" && (
          <>
            <Button variant="primary" size="sm" onClick={onReschedule}>
              Reschedule
            </Button>
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
