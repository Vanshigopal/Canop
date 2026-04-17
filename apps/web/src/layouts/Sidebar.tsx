import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@raquel/ui";
import { BrandMark } from "@/components/brand/BrandMark";
import { useAuthStore } from "@/stores/auth";
import { useSidebarStore } from "@/stores/sidebar";
import { useStatsStore } from "@/stores/stats";
import { getNavigationForRole, type NavGroup } from "@/lib/navigation";
import { SidebarNav } from "./SidebarNav";
import { UserMenu } from "./UserMenu";

interface SidebarProps {
  className?: string;
  forceExpanded?: boolean;
}

export function Sidebar({ className, forceExpanded }: SidebarProps) {
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const permissions = useAuthStore((s) => s.permissions);
  const collapsed = useSidebarStore((s) => s.collapsed);
  const toggle = useSidebarStore((s) => s.toggle);
  const location = useLocation();
  const stats = useStatsStore();

  useEffect(() => {
    if (user) stats.fetch();
  }, [user]);

  const isCollapsed = forceExpanded ? false : collapsed;
  const baseNav = getNavigationForRole(user?.role, permissions);

  const navGroups: NavGroup[] = baseNav.map((g) => ({
    ...g,
    items: g.items.map((item) => {
      if (item.path === "/students" && stats.loaded) return { ...item, badge: String(stats.studentCount) };
      if (item.path === "/join-requests" && stats.loaded) return { ...item, badge: stats.pendingJoinRequests > 0 ? String(stats.pendingJoinRequests) : undefined };
      return item;
    }),
  }));

  return (
    <aside
      className={cn("flex flex-col h-screen shrink-0", className)}
      style={{
        width: isCollapsed ? 72 : 260,
        background: "rgba(255, 253, 250, 0.72)",
        backdropFilter: "blur(32px) saturate(1.6)",
        WebkitBackdropFilter: "blur(32px) saturate(1.6)",
        borderRight: "1px solid rgba(90, 70, 50, 0.10)",
        boxShadow: "inset -1px 0 0 rgba(255, 255, 255, 0.6)",
        padding: isCollapsed ? "30px 10px" : "30px 22px",
        transition: "width 0.3s cubic-bezier(0.16, 1, 0.3, 1), padding 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {/* Brand */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <BrandMark size={isCollapsed ? 36 : 40} />
          {!isCollapsed && (
            <span
              className="text-text-primary truncate"
              style={{
                fontFamily: '"Fraunces", serif',
                fontStyle: "italic",
                fontWeight: 500,
                fontSize: 24,
              }}
            >
              Raquel
            </span>
          )}
        </div>
        {!forceExpanded && !isCollapsed && (
          <button
            onClick={toggle}
            className="p-1.5 rounded-md text-text-dim hover:text-text-body hover:bg-white/50 transition-colors shrink-0"
          >
            <PanelLeftClose size={16} />
          </button>
        )}
      </div>

      {/* Expand toggle when collapsed */}
      {!forceExpanded && isCollapsed && (
        <button
          onClick={toggle}
          className="mx-auto mb-4 p-1.5 rounded-md text-text-dim hover:text-text-body hover:bg-white/50 transition-colors"
        >
          <PanelLeftOpen size={16} />
        </button>
      )}

      {/* Institute tag */}
      {!isCollapsed && tenant && (
        <div
          className="mb-6"
          style={{
            padding: "12px 14px",
            background: "rgba(255, 255, 255, 0.92)",
            border: "1px solid rgba(90, 70, 50, 0.10)",
            borderRadius: 14,
            boxShadow: "0 1px 2px rgba(0,0,0,0.02), 0 2px 6px rgba(0,0,0,0.03)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="shrink-0"
              style={{
                width: 8,
                height: 8,
                background: "#059669",
                borderRadius: "50%",
                boxShadow: "0 0 10px #059669",
              }}
            />
            <span className="text-sm font-medium text-text-primary truncate">{tenant.name}</span>
          </div>
        </div>
      )}

      {/* Navigation groups */}
      <nav className="flex-1 overflow-y-auto space-y-6 -mx-1 px-1">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!isCollapsed && (
              <div
                className="mb-2"
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  color: "#A89E95",
                  paddingLeft: 12,
                }}
              >
                {group.label}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <SidebarNav
                  key={item.path}
                  item={item}
                  collapsed={isCollapsed}
                  active={
                    location.pathname === item.path ||
                    (item.path !== "/dashboard" &&
                      item.path !== "/portal" &&
                      item.path !== "/parent" &&
                      location.pathname.startsWith(item.path + "/"))
                  }
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <UserMenu collapsed={isCollapsed} />
    </aside>
  );
}
