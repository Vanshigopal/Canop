import { CheckCircle2, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { platformApi } from "@/stores/platform-auth";
import { Card, PageHeader, Stat } from "./shared";

export function SystemPage() {
  const {
    data: health,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["platform", "system", "health"],
    queryFn: async () =>
      (await platformApi.get("/api/v1/platform/system/health")).data.data,
    refetchInterval: 30_000,
  });

  const checks = health?.checks ?? {};
  const proc = health?.process ?? {};

  return (
    <div>
      <PageHeader
        title="System Health"
        subtitle="Live status of API dependencies and runtime metrics."
        actions={
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-md text-sm hover:bg-slate-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <ServiceCard name="Database (Postgres)" check={checks.database} />
        <ServiceCard name="Redis Cache" check={checks.redis} />
        <ServiceCard name="ML Service" check={checks.mlService} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label="Uptime"
          value={`${Math.floor((proc.uptimeSeconds ?? 0) / 3600)}h ${Math.floor(
            ((proc.uptimeSeconds ?? 0) % 3600) / 60,
          )}m`}
        />
        <Stat label="Heap Used" value={`${proc.heapUsedMb ?? 0} MB`} />
        <Stat label="RSS Memory" value={`${proc.rssMb ?? 0} MB`} />
        <Stat label="Node Version" value={proc.nodeVersion ?? "—"} />
      </div>

      {isLoading && <div className="mt-6 text-slate-400 text-sm">Loading…</div>}
    </div>
  );
}

function ServiceCard({
  name,
  check,
}: {
  name: string;
  check?: { status: string; latencyMs?: number; error?: string };
}) {
  if (!check) {
    return (
      <Card className="p-4">
        <div className="text-sm font-medium mb-1">{name}</div>
        <div className="text-xs text-slate-400">Loading…</div>
      </Card>
    );
  }

  const isOk = check.status === "ok";
  const isDegraded = check.status === "degraded" || check.status === "unavailable";

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-medium">{name}</div>
          <div
            className={`text-xs mt-1 uppercase tracking-wider ${
              isOk ? "text-emerald-600" : isDegraded ? "text-amber-600" : "text-red-600"
            }`}
          >
            {check.status}
          </div>
        </div>
        {isOk ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        ) : isDegraded ? (
          <AlertTriangle className="w-5 h-5 text-amber-500" />
        ) : (
          <XCircle className="w-5 h-5 text-red-500" />
        )}
      </div>
      {check.latencyMs !== undefined && (
        <div className="text-xs text-slate-500 mt-2">
          Latency: {check.latencyMs}ms
        </div>
      )}
      {check.error && (
        <div className="text-xs text-red-700 mt-2 font-mono truncate">
          {check.error}
        </div>
      )}
    </Card>
  );
}
