import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, Menu, LogOut } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { useSidebarStore } from "@/stores/sidebar";
import { NotificationDropdown } from "./NotificationDropdown";

export function Topbar() {
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const logout = useAuthStore((s) => s.logout);
  const setMobileOpen = useSidebarStore((s) => s.setMobileOpen);
  const navigate = useNavigate();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showUserMenu) return;
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node))
        setShowUserMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showUserMenu]);

  const handleLogout = async () => {
    setShowUserMenu(false);
    await logout();
    navigate("/login");
  };

  const initials = user
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "";

  const iconBtnStyle = {
    width: 40,
    height: 40,
    borderRadius: 12,
    background: "rgba(255, 255, 255, 0.92)",
    border: "1px solid rgba(90, 70, 50, 0.10)",
    boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
    display: "grid" as const,
    placeItems: "center" as const,
  };

  return (
    <div className="flex items-center justify-between mb-8">
      {/* Mobile hamburger */}
      <button
        className="lg:hidden p-2 -ml-2 rounded-xl text-text-muted hover:text-text-body transition-colors"
        onClick={() => setMobileOpen(true)}
      >
        <Menu size={22} />
      </button>

      {/* Search trigger */}
      <button
        onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
        className="hidden sm:flex items-center gap-3 flex-1 max-w-[460px] text-left"
        style={{
          background: "rgba(255, 255, 255, 0.92)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(90, 70, 50, 0.10)",
          borderRadius: 13,
          padding: "11px 16px",
          boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
        }}
      >
        <Search size={16} className="text-text-dim shrink-0" />
        <span style={{ fontSize: 13, color: "#7A716B" }}>Search anything...</span>
        <span
          className="ml-auto shrink-0"
          style={{
            padding: "2px 8px",
            background: "#F5EFE6",
            borderRadius: 5,
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 10,
            color: "#7A716B",
          }}
        >
          ⌘K
        </span>
      </button>

      {/* Actions */}
      <div className="flex items-center gap-2 ml-auto pl-4">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative"
            style={iconBtnStyle}
          >
            <Bell size={17} className="text-text-muted" />
            <div
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                width: 7,
                height: 7,
                background: "#EC4899",
                borderRadius: "50%",
                boxShadow: "0 0 8px #EC4899",
              }}
            />
          </button>
          {showNotifications && (
            <NotificationDropdown onClose={() => setShowNotifications(false)} />
          )}
        </div>

        {/* User avatar */}
        {user && (
          <div ref={userMenuRef} className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="grid place-items-center text-white text-xs font-semibold"
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "linear-gradient(135deg, #FB923C, #EC4899)",
              }}
            >
              {initials}
            </button>
            {showUserMenu && (
              <div
                className="absolute right-0 top-full mt-2 z-50 glass-panel overflow-hidden"
                style={{ width: 220, animation: "fadeUp 0.15s ease-out" }}
              >
                <div className="p-3">
                  <div className="px-2 py-1.5">
                    <div className="text-sm font-medium text-text-primary">{user.name}</div>
                    <div className="text-2xs text-text-dim capitalize">
                      {user.role.toLowerCase()} &middot; {tenant?.name}
                    </div>
                  </div>
                  <div className="my-1.5 h-px bg-border-soft" />
                  <button
                    onClick={() => {
                      navigate("/settings");
                      setShowUserMenu(false);
                    }}
                    className="w-full px-2 py-1.5 text-left text-sm text-text-body hover:bg-white/80 rounded-lg transition-colors"
                  >
                    Profile
                  </button>
                  <div className="w-full px-2 py-1.5 text-sm text-text-dim flex items-center justify-between cursor-not-allowed">
                    <span>Switch theme</span>
                    <span className="text-2xs italic">Coming soon</span>
                  </div>
                  <div className="my-1.5 h-px bg-border-soft" />
                  <button
                    onClick={handleLogout}
                    className="w-full px-2 py-1.5 text-left text-sm text-danger hover:bg-danger/5 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <LogOut size={14} />
                    Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
