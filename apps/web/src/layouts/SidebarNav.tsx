import { useNavigate } from "react-router-dom";
import type { NavItem } from "@/lib/navigation";
import { useState } from "react";

interface SidebarNavProps {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
}

export function SidebarNav({ item, collapsed, active }: SidebarNavProps) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const Icon = item.icon;

  return (
    <button
      onClick={() => navigate(item.path)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={collapsed ? item.name : undefined}
      className="w-full flex items-center gap-3"
      style={{
        padding: collapsed ? "10px" : "10px 12px",
        borderRadius: 11,
        fontSize: "13.5px",
        fontWeight: 500,
        color: active || hovered ? "#1E1A1A" : "#3D3632",
        background: active
          ? "linear-gradient(135deg, rgba(254, 205, 211, 0.5), rgba(186, 230, 253, 0.35))"
          : hovered
            ? "rgba(255, 255, 255, 0.92)"
            : "transparent",
        boxShadow: active
          ? "inset 0 1px 0 rgba(255, 255, 255, 0.8), 0 2px 8px rgba(99, 102, 241, 0.08)"
          : "none",
        transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        justifyContent: collapsed ? "center" : undefined,
      }}
    >
      <Icon size={18} className="shrink-0" />
      {!collapsed && (
        <>
          <span className="truncate">{item.name}</span>
          {item.badge && (
            <span
              className="ml-auto shrink-0"
              style={{
                padding: "2px 8px",
                borderRadius: 6,
                fontSize: 10,
                fontWeight: 600,
                color: "white",
                background:
                  item.badgeTone === "danger"
                    ? "#DC2626"
                    : item.badgeTone === "warning"
                      ? "#D97706"
                      : "#4F46E5",
              }}
            >
              {item.badge}
            </span>
          )}
        </>
      )}
    </button>
  );
}
