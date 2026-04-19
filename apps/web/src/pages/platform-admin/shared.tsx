import { useQuery } from "@tanstack/react-query";
import { platformApi } from "@/stores/platform-auth";

export function formatInr(n: number | string | null | undefined): string {
  if (n == null) return "₹0";
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (Number.isNaN(num)) return "₹0";
  return `₹${new Intl.NumberFormat("en-IN").format(Math.round(num))}`;
}

export function formatInrCompact(n: number | string | null | undefined): string {
  if (n == null) return "₹0";
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (Number.isNaN(num)) return "₹0";
  if (num >= 1e7) return `₹${(num / 1e7).toFixed(1)}Cr`;
  if (num >= 1e5) return `₹${(num / 1e5).toFixed(1)}L`;
  if (num >= 1e3) return `₹${(num / 1e3).toFixed(1)}K`;
  return `₹${num}`;
}

export function formatRelativeDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = new Date(d);
  const diff = Date.now() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString("en-IN");
}

export function usePlatformQuery<T>(key: readonly unknown[], url: string) {
  return useQuery<T>({
    queryKey: key,
    queryFn: async () => {
      const res = await platformApi.get(url);
      return res.data.data;
    },
  });
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#0F172A]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-lg shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  trend,
  subtitle,
}: {
  label: string;
  value: string | number;
  trend?: string;
  subtitle?: string;
}) {
  return (
    <Card className="p-5">
      <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">
        {label}
      </div>
      <div className="text-2xl font-semibold text-[#0F172A]">{value}</div>
      {subtitle && <div className="text-xs text-slate-500 mt-1">{subtitle}</div>}
      {trend && (
        <div
          className={`text-xs mt-2 ${
            trend.startsWith("-") ? "text-red-600" : "text-emerald-600"
          }`}
        >
          {trend}
        </div>
      )}
    </Card>
  );
}

export function Badge({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "green" | "blue" | "amber" | "red" | "violet";
}) {
  const tones: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-700",
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
    violet: "bg-violet-100 text-violet-700",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export const PLAN_TONES: Record<string, "slate" | "green" | "blue" | "amber" | "red" | "violet"> = {
  FREE_TRIAL: "amber",
  STARTER: "blue",
  GROWTH: "violet",
  PROFESSIONAL: "green",
  ENTERPRISE: "red",
  CUSTOM: "slate",
};

export const STATUS_TONES: Record<string, "slate" | "green" | "blue" | "amber" | "red" | "violet"> = {
  ACTIVE: "green",
  TRIAL: "amber",
  SUSPENDED: "red",
  PAST_DUE: "amber",
  CANCELLED: "slate",
  EXPIRED: "slate",
};
