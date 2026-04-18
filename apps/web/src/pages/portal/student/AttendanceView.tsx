import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Empty,
  PortalCard,
  PortalSkeleton,
  SectionHeader,
  severityColor,
} from "@/components/portal/PortalPrimitives";
import type { AttendanceCalendar } from "@/components/portal/portal-types";

interface Props {
  data: AttendanceCalendar | null;
  loading: boolean;
  month: string;
  onMonthChange: (month: string) => void;
}

function parseMonth(month: string) {
  const parts = month.split("-").map(Number);
  return {
    year: parts[0] ?? new Date().getFullYear(),
    mon: parts[1] ?? new Date().getMonth() + 1,
  };
}

function formatMonth(month: string) {
  const { year, mon } = parseMonth(month);
  return new Date(year, mon - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function shiftMonth(month: string, delta: number): string {
  const { year, mon } = parseMonth(month);
  const d = new Date(year, mon - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function dayColor(statuses: string[]): string {
  if (statuses.length === 0) return "transparent";
  if (statuses.every((s) => s === "PRESENT")) return "#10B981";
  if (statuses.some((s) => s === "ABSENT")) return "#DC2626";
  if (statuses.some((s) => s === "LATE")) return "#F59E0B";
  return "#6B7280";
}

export function AttendanceView({ data, loading, month, onMonthChange }: Props) {
  const { year, mon } = parseMonth(month);
  const [selected, setSelected] = useState<string | null>(null);

  const grid = useMemo(() => {
    const firstDay = new Date(year, mon - 1, 1);
    const firstDow = (firstDay.getDay() + 6) % 7; // Monday-first
    const daysInMonth = new Date(year, mon, 0).getDate();
    const cells: Array<{ day: number | null; iso: string | null }> = [];
    for (let i = 0; i < firstDow; i++) cells.push({ day: null, iso: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${year}-${String(mon).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ day: d, iso });
    }
    while (cells.length % 7 !== 0) cells.push({ day: null, iso: null });
    return cells;
  }, [year, mon]);

  const weekDays = ["M", "T", "W", "T", "F", "S", "S"];
  const selectedEntries = selected && data?.days[selected] ? data.days[selected] : null;

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader title="Attendance" />

      <PortalCard padded={false} className="p-5">
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => onMonthChange(shiftMonth(month, -1))}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ minWidth: 44, minHeight: 44, backgroundColor: "#F1EFE8" }}
            aria-label="Previous month"
          >
            <ChevronLeft size={18} />
          </button>
          <div
            className="text-base font-medium"
            style={{ fontFamily: "Fraunces, serif", color: "#2C2C2A" }}
          >
            {formatMonth(month)}
          </div>
          <button
            type="button"
            onClick={() => onMonthChange(shiftMonth(month, 1))}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ minWidth: 44, minHeight: 44, backgroundColor: "#F1EFE8" }}
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {loading && !data ? (
          <PortalSkeleton height={260} />
        ) : (
          <>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {weekDays.map((d, i) => (
                <div
                  key={`${d}-${i}`}
                  className="text-[10px] text-center font-semibold uppercase"
                  style={{ color: "#6B6A66" }}
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {grid.map((c, i) => {
                if (!c.day || !c.iso)
                  return <div key={`e-${i}`} className="aspect-square" />;
                const entries = data?.days[c.iso] ?? [];
                const dotColor = dayColor(entries.map((e) => e.status));
                const isSelected = selected === c.iso;
                return (
                  <button
                    key={c.iso}
                    type="button"
                    onClick={() => setSelected(isSelected ? null : c.iso)}
                    className="aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors active:scale-95"
                    style={{
                      backgroundColor: isSelected ? "#E0E7FF" : "transparent",
                      border: isSelected
                        ? "1.5px solid #4F46E5"
                        : "1px solid transparent",
                      minHeight: 44,
                      minWidth: 44,
                    }}
                    aria-label={`Day ${c.day}`}
                  >
                    <span
                      className="text-sm"
                      style={{
                        color: "#2C2C2A",
                        fontWeight: entries.length > 0 ? 500 : 400,
                      }}
                    >
                      {c.day}
                    </span>
                    {entries.length > 0 && (
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: dotColor }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </PortalCard>

      {data?.summary && (
        <PortalCard>
          <p
            className="text-[10px] uppercase tracking-[0.15em] mb-2"
            style={{ color: "#6B6A66", fontWeight: 600 }}
          >
            This month
          </p>
          <div className="flex items-baseline gap-2 mb-3">
            <span
              className="text-3xl font-semibold"
              style={{ color: severityColor(data.summary.percentage) }}
            >
              {data.summary.percentage !== null ? `${data.summary.percentage}%` : "—"}
            </span>
            <span className="text-xs" style={{ color: "#6B6A66" }}>
              {data.summary.total} classes
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Present" value={data.summary.present} color="#10B981" />
            <Stat label="Absent" value={data.summary.absent} color="#DC2626" />
            <Stat label="Late" value={data.summary.late} color="#F59E0B" />
          </div>
        </PortalCard>
      )}

      {selectedEntries && selectedEntries.length > 0 && (
        <section>
          <SectionHeader title={formatSelectedDate(selected!)} />
          <div className="flex flex-col gap-2">
            {selectedEntries.map((e, i) => (
              <div
                key={`${selected}-${i}`}
                className="glass-panel p-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: "#2C2C2A" }}>
                    {e.subjectName ?? e.type}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#6B6A66" }}>
                    {e.type}
                    {e.startTime ? ` · ${e.startTime}` : ""}
                    {e.method ? ` · ${e.method}` : ""}
                  </p>
                </div>
                <AttendanceStatusChip status={e.status} />
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && data && data.summary.total === 0 && (
        <Empty
          title="No classes this month"
          body="Sessions scheduled by your institute will appear here."
        />
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      className="rounded-xl px-3 py-2 text-center"
      style={{ backgroundColor: "#FBFAF6" }}
    >
      <p className="text-xl font-semibold" style={{ color }}>
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wider" style={{ color: "#6B6A66" }}>
        {label}
      </p>
    </div>
  );
}

function AttendanceStatusChip({ status }: { status: string }) {
  const palette: Record<string, { bg: string; fg: string; label: string }> = {
    PRESENT: { bg: "#DCFCE7", fg: "#14532D", label: "Present" },
    ABSENT: { bg: "#FEE2E2", fg: "#7F1D1D", label: "Absent" },
    LATE: { bg: "#FEF3C7", fg: "#78350F", label: "Late" },
    EXCUSED: { bg: "#E0E7FF", fg: "#312E81", label: "Excused" },
  };
  const p = palette[status] ?? {
    bg: "#F1EFE8",
    fg: "#5F5E5A",
    label: status,
  };
  return (
    <span
      className="inline-flex px-2.5 h-6 items-center rounded-full text-[11px] font-semibold"
      style={{ backgroundColor: p.bg, color: p.fg }}
    >
      {p.label}
    </span>
  );
}

function formatSelectedDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
