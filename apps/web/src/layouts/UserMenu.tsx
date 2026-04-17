import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
import { LogOut } from "lucide-react";

export function UserMenu({ collapsed }: { collapsed: boolean }) {
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate("/login");
  };

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div ref={ref} className="relative mt-auto pt-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left"
        style={{
          padding: 14,
          background: "rgba(255, 255, 255, 0.92)",
          border: "1px solid rgba(90, 70, 50, 0.10)",
          borderRadius: 16,
          boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="grid place-items-center text-white text-xs font-semibold shrink-0"
            style={{
              width: 38,
              height: 38,
              background: "linear-gradient(135deg, #FB923C, #EC4899)",
              borderRadius: "50%",
            }}
          >
            {initials}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-medium text-text-primary truncate">{user.name}</div>
              <div className="text-2xs text-text-dim capitalize">{user.role.toLowerCase()}</div>
            </div>
          )}
        </div>
      </button>

      {open && (
        <div
          className="absolute bottom-full left-0 right-0 mb-2 z-50 glass-panel overflow-hidden"
          style={{ animation: "fadeUp 0.15s ease-out" }}
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
                setOpen(false);
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
  );
}
