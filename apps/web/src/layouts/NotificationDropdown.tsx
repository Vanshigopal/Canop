import { useEffect, useRef } from "react";

const notifications = [
  { id: 1, text: "New join request from Priya Sharma", time: "2m ago", unread: true },
  { id: 2, text: "Fee payment received — \u20B918,500", time: "8m ago", unread: true },
  { id: 3, text: "OMR scan complete — 38 sheets", time: "14m ago", unread: false },
];

export function NotificationDropdown({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 z-50 glass-panel overflow-hidden"
      style={{ width: 320, animation: "fadeUp 0.15s ease-out" }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-soft">
        <span className="text-sm font-semibold text-text-primary">Notifications</span>
        <button className="text-2xs text-indigo hover:underline">Mark all read</button>
      </div>
      <div>
        {notifications.map((n) => (
          <div
            key={n.id}
            className="px-4 py-3 flex items-start gap-3 border-b border-border-soft last:border-0 hover:bg-white/50 transition-colors cursor-pointer"
          >
            <div className="mt-1.5 shrink-0" style={{ width: 8, height: 8 }}>
              {n.unread && (
                <div
                  className="w-full h-full rounded-full"
                  style={{ background: "#EC4899", boxShadow: "0 0 6px #EC4899" }}
                />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm text-text-body leading-snug">{n.text}</p>
              <p className="text-2xs text-text-dim mt-1">{n.time}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 py-3 border-t border-border-soft">
        <button className="text-xs text-indigo font-medium hover:underline">
          View all notifications &rarr;
        </button>
      </div>
    </div>
  );
}
