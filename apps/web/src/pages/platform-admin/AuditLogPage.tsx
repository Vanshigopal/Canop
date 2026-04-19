import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { platformApi } from "@/stores/platform-auth";
import { Badge, Card, PageHeader, formatRelativeDate } from "./shared";

const ACTION_TONES: Record<string, "slate" | "green" | "red" | "amber" | "blue"> = {
  "tenant:created": "green",
  "tenant:suspended": "red",
  "tenant:reactivated": "green",
  "tenant:deleted": "red",
  "owner:added": "blue",
  "owner:removed": "red",
  "owner:password-reset": "amber",
  "subscription:updated": "blue",
  "admin:created": "blue",
  "admin:deleted": "red",
  "platform:login": "slate",
};

export function AuditLogPage() {
  const [action, setAction] = useState("");
  const [targetType, setTargetType] = useState("");

  const { data } = useQuery({
    queryKey: ["platform", "audit", action, targetType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (action) params.set("action", action);
      if (targetType) params.set("targetType", targetType);
      params.set("pageSize", "100");
      const res = await platformApi.get(
        `/api/v1/platform/audit-logs?${params.toString()}`,
      );
      return res.data;
    },
  });

  const logs = data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Audit Log"
        subtitle="All actions performed by platform admins."
      />

      <Card className="p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <input
            type="search"
            placeholder="Filter by action..."
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-2 border border-slate-200 rounded-md text-sm"
          />
          <select
            value={targetType}
            onChange={(e) => setTargetType(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-md text-sm"
          >
            <option value="">All targets</option>
            <option value="tenant">Tenant</option>
            <option value="user">User</option>
            <option value="subscription">Subscription</option>
            <option value="platform_admin">Platform Admin</option>
          </select>
        </div>
      </Card>

      <Card>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-slate-500">
            <tr className="text-left border-b border-slate-200">
              <th className="px-4 py-3 w-8"></th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Admin</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3">IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  No audit entries match these filters.
                </td>
              </tr>
            ) : (
              logs.map((log: any) => <AuditRow key={log.id} log={log} />)
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function AuditRow({ log }: { log: any }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = log.details && Object.keys(log.details).length > 0;

  return (
    <>
      <tr className="border-t border-slate-100 hover:bg-slate-50">
        <td className="px-4 py-2.5">
          {hasDetails && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="p-0.5 hover:bg-slate-200 rounded"
            >
              {expanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
          )}
        </td>
        <td className="px-4 py-2.5 text-xs text-slate-500">
          {formatRelativeDate(log.createdAt)}
        </td>
        <td className="px-4 py-2.5">
          <div>{log.admin?.name ?? "—"}</div>
          <div className="text-xs text-slate-400">{log.admin?.email}</div>
        </td>
        <td className="px-4 py-2.5">
          <Badge tone={ACTION_TONES[log.action] ?? "slate"}>{log.action}</Badge>
        </td>
        <td className="px-4 py-2.5 text-slate-600 text-xs">
          {log.targetType}
          {log.targetId && (
            <span className="text-slate-400 ml-1 font-mono">
              {log.targetId.substring(0, 8)}
            </span>
          )}
        </td>
        <td className="px-4 py-2.5 text-xs text-slate-500 font-mono">
          {log.ipAddress ?? "—"}
        </td>
      </tr>
      {expanded && hasDetails && (
        <tr className="bg-slate-50">
          <td></td>
          <td colSpan={5} className="px-4 py-3">
            <pre className="text-xs text-slate-700 overflow-x-auto">
              {JSON.stringify(log.details, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}
