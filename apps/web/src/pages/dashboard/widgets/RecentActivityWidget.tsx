import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Activity } from "lucide-react";
import { api } from "@/lib/api";

interface RecentItem {
  id: string;
  type: string;
  title: string;
  subtitle: string | null;
  createdAt: string;
}

export function RecentActivityWidget(_: { config: Record<string, unknown> }) {
  const { data, isLoading } = useQuery<{ recentItems: RecentItem[] }>({
    queryKey: ["widget-recent-activity"],
    queryFn: () => api.get("/api/v1/stats/recent-items").then((r) => r.data.data),
    staleTime: 60_000,
  });

  return (
    <div className="h-full flex flex-col p-4">
      <h3 className="text-sm font-medium mb-2">Recent activity</h3>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-text-muted text-xs">
            Loading…
          </div>
        ) : !data?.recentItems || data.recentItems.length === 0 ? (
          <div className="h-full flex items-center justify-center text-text-muted text-xs">
            Nothing to show yet
          </div>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {data.recentItems.slice(0, 8).map((item) => (
              <li key={item.id} className="flex items-start gap-2">
                <Activity size={12} className="text-text-muted mt-1 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="truncate">{item.title}</div>
                  <div className="text-xs text-text-muted">
                    {format(new Date(item.createdAt), "dd MMM, hh:mm a")}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
