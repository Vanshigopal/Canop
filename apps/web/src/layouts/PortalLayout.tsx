import { Award, Bell, Calendar, Home, Wallet } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import { api } from "@/lib/api";

interface Tab {
  label: string;
  icon: typeof Home;
  path: string;
  matchPrefix?: string;
}

export function PortalLayout() {
  const { user, tenant } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  const role = (user?.role ?? "STUDENT") as "STUDENT" | "PARENT";
  const basePath = role === "STUDENT" ? "/portal/student" : "/portal/parent";

  const loadUnread = useCallback(async () => {
    try {
      const { data } = await api.get("/api/v1/notifications/unread-count");
      setUnreadCount(data.data?.count ?? 0);
    } catch {
      // swallow — portal remains usable if endpoint is briefly unavailable
    }
  }, []);

  useEffect(() => {
    loadUnread();
    const t = setInterval(loadUnread, 60_000);
    return () => clearInterval(t);
  }, [loadUnread]);

  useSocket("broadcast:sent", loadUnread);
  useSocket("notification:new", loadUnread);

  const tabs: Tab[] = [
    { label: "Home", icon: Home, path: basePath },
    { label: "Classes", icon: Calendar, path: `${basePath}/attendance` },
    { label: "Grades", icon: Award, path: `${basePath}/grades` },
    { label: "Fees", icon: Wallet, path: `${basePath}/fees` },
    { label: "Inbox", icon: Bell, path: `${basePath}/inbox` },
  ];

  const activeTab =
    tabs.find((t) =>
      t.path === basePath
        ? location.pathname === basePath
        : location.pathname.startsWith(t.path),
    ) ?? tabs[0]!;

  const greeting = user?.name?.[0]?.toUpperCase() ?? "?";

  return (
    <div
      data-portal
      className="min-h-dvh flex flex-col"
      style={{
        backgroundColor: "#FAF7F2",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <header
        className="sticky top-0 z-30 backdrop-blur-md"
        style={{
          backgroundColor: "rgba(250, 247, 242, 0.88)",
          borderBottom: "1px solid rgba(90, 70, 50, 0.08)",
          paddingTop: "env(safe-area-inset-top)",
        }}
      >
        <div className="mx-auto max-w-[640px] px-4 h-14 flex items-center justify-between">
          <div
            className="text-sm tracking-tight"
            style={{
              fontFamily: "Fraunces, serif",
              fontStyle: "italic",
              fontWeight: 500,
            }}
          >
            {tenant?.name ?? "Raquel"}
          </div>
          <button
            type="button"
            onClick={() => navigate(`${basePath}/profile`)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-transform active:scale-95"
            style={{
              backgroundColor: "#E8E3DA",
              color: "#3D3632",
              minWidth: 44,
              minHeight: 44,
            }}
            aria-label="Profile"
          >
            {greeting}
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[640px] px-4 pt-4 pb-28">
          <Outlet />
        </div>
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-30 backdrop-blur-md"
        style={{
          backgroundColor: "rgba(250, 247, 242, 0.96)",
          borderTop: "1px solid rgba(90, 70, 50, 0.08)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="mx-auto max-w-[640px] flex items-stretch justify-around h-16">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab.path === tab.path;
            const badge = tab.label === "Inbox" && unreadCount > 0 ? unreadCount : 0;
            return (
              <button
                key={tab.path}
                type="button"
                onClick={() => navigate(tab.path)}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-colors active:bg-black/5"
                style={{ minWidth: 44, minHeight: 44 }}
                aria-label={tab.label}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.4 : 1.6}
                  color={isActive ? "#4F46E5" : "#6B6A66"}
                />
                <span
                  className="text-[11px] leading-none"
                  style={{
                    color: isActive ? "#4F46E5" : "#6B6A66",
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  {tab.label}
                </span>
                {badge > 0 && (
                  <span
                    className="absolute top-2 right-1/2 translate-x-3 min-w-[16px] h-4 rounded-full px-1 flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ backgroundColor: "#EC4899" }}
                  >
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
