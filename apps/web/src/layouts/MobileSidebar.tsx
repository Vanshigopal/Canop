import { X } from "lucide-react";
import { useSidebarStore } from "@/stores/sidebar";
import { Sidebar } from "./Sidebar";

export function MobileSidebar() {
  const mobileOpen = useSidebarStore((s) => s.mobileOpen);
  const setMobileOpen = useSidebarStore((s) => s.setMobileOpen);

  if (!mobileOpen) return null;

  return (
    <div className="lg:hidden fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        style={{ animation: "fadeIn 0.2s ease-out" }}
        onClick={() => setMobileOpen(false)}
      />
      <div className="relative z-10 h-full" style={{ animation: "slideInLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}>
        <Sidebar forceExpanded />
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-6 -right-10 p-1.5 rounded-full bg-white/90 text-text-muted hover:text-text-body shadow-sm"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
