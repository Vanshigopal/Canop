import { Bell, CheckCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { api } from "@/lib/api";
import {
  Empty,
  PortalCard,
  PortalSkeleton,
  SectionHeader,
} from "@/components/portal/PortalPrimitives";
import type { NotificationItem } from "@/components/portal/portal-types";

export function NotificationsInbox() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/api/v1/notifications/inbox?limit=100");
      setItems(data.data ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useSocket("broadcast:sent", load);
  useSocket("notification:new", load);

  const markRead = async (id: string) => {
    const previous = items;
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, readAt: new Date().toISOString() } : i)),
    );
    try {
      await api.post(`/api/v1/notifications/${id}/mark-read`);
    } catch {
      setItems(previous);
    }
  };

  const markAllRead = async () => {
    const previous = items;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((i) => (i.readAt ? i : { ...i, readAt: now })));
    try {
      await api.post("/api/v1/notifications/mark-all-read");
    } catch {
      setItems(previous);
    }
  };

  const unreadCount = items.filter((i) => !i.readAt).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <SectionHeader title="Inbox" />
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="text-xs font-medium px-3 py-2 rounded-full inline-flex items-center gap-1"
            style={{
              color: "#4F46E5",
              backgroundColor: "#E0E7FF",
              minHeight: 44,
            }}
          >
            <CheckCheck size={14} />
            Mark all read
          </button>
        )}
      </div>

      {loading && items.length === 0 ? (
        <div className="flex flex-col gap-2">
          <PortalSkeleton height={72} />
          <PortalSkeleton height={72} />
          <PortalSkeleton height={72} />
        </div>
      ) : items.length === 0 ? (
        <Empty
          icon={<Bell size={20} />}
          title="No messages yet"
          body="Notifications from your institute will appear here."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((n) => (
            <PortalCard
              key={n.id}
              padded={false}
              className="p-4"
              style={
                !n.readAt
                  ? { backgroundColor: "rgba(224, 231, 255, 0.45)" }
                  : undefined
              }
            >
              <button
                type="button"
                onClick={() => !n.readAt && markRead(n.id)}
                className="w-full text-left"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-2 h-2 rounded-full mt-2 shrink-0"
                    style={{
                      backgroundColor: n.readAt ? "transparent" : "#4F46E5",
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p
                        className="text-xs font-semibold truncate"
                        style={{ color: "#2C2C2A" }}
                      >
                        {n.campaign?.title ??
                          n.eventType?.replace(/_/g, " ") ??
                          "Notification"}
                      </p>
                      <span className="text-[10px] shrink-0" style={{ color: "#6B6A66" }}>
                        {formatRelative(n.createdAt)}
                      </span>
                    </div>
                    <p
                      className="text-sm whitespace-pre-wrap break-words"
                      style={{ color: "#2C2C2A" }}
                    >
                      {n.message}
                    </p>
                    {n.campaign?.createdBy?.name && (
                      <p className="text-[11px] mt-1.5" style={{ color: "#6B6A66" }}>
                        from {n.campaign.createdBy.name}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            </PortalCard>
          ))}
        </div>
      )}
    </div>
  );
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.round(diff / (60 * 1000));
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
