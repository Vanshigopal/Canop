import {
  Activity,
  Building2,
  FileSearch,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect } from "react";
import { NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import { usePlatformAuth } from "@/stores/platform-auth";

const NAV_ITEMS = [
  { to: "/platform-admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/platform-admin/tenants", label: "Tenants", icon: Building2 },
  { to: "/platform-admin/revenue", label: "Revenue", icon: Wallet },
  { to: "/platform-admin/growth", label: "Growth", icon: TrendingUp },
  { type: "divider" as const },
  { to: "/platform-admin/system", label: "System", icon: Activity },
  { to: "/platform-admin/admins", label: "Admins", icon: Users },
  { to: "/platform-admin/audit", label: "Audit Log", icon: FileSearch },
];

export function PlatformAdminLayout() {
  const { isAuthenticated, admin, logout, fetchMe } = usePlatformAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && !admin) {
      void fetchMe();
    }
  }, [isAuthenticated, admin, fetchMe]);

  if (!isAuthenticated) {
    return <Navigate to="/platform-admin/login" replace />;
  }

  const handleLogout = async () => {
    await logout();
    navigate("/platform-admin/login");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <div className="flex">
        {/* Sidebar */}
        <aside className="fixed inset-y-0 left-0 w-60 bg-[#1A1A2E] text-white z-40 flex flex-col">
          <div className="px-6 py-5 border-b border-white/10">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
              <div className="leading-tight">
                <div className="text-sm font-semibold tracking-wide">CANOP</div>
                <div className="text-[10px] text-blue-300 uppercase tracking-wider">
                  Platform Admin
                </div>
              </div>
            </div>
          </div>

          <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
            {NAV_ITEMS.map((item, i) => {
              if ("type" in item && item.type === "divider") {
                return (
                  <div key={`d-${i}`} className="my-3 border-t border-white/10" />
                );
              }
              const Icon = item.icon!;
              return (
                <NavLink
                  key={item.to}
                  to={item.to!}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                      isActive
                        ? "bg-blue-500/20 text-blue-200 font-medium"
                        : "text-gray-300 hover:bg-white/5 hover:text-white"
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="px-4 py-3 border-t border-white/10">
            <div className="text-xs text-gray-400 mb-1">
              {admin?.name ?? "Loading..."}
            </div>
            <div className="text-xs text-gray-500 mb-2">{admin?.email}</div>
            <div className="text-[10px] text-blue-300 uppercase tracking-wider mb-3">
              {admin?.role?.replace("_", " ")}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 ml-60 min-h-screen">
          <div className="px-8 py-6 max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
