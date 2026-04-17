import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Breadcrumbs } from "./Breadcrumbs";
import { MobileSidebar } from "./MobileSidebar";
import { CommandPalette } from "./CommandPalette";

export function DashboardLayout() {
  return (
    <div className="flex h-screen bg-bg-base overflow-hidden">
      <Sidebar className="hidden lg:flex" />
      <MobileSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-6 sm:px-8 lg:px-10 pt-8 shrink-0">
          <Topbar />
        </div>
        <main className="flex-1 overflow-y-auto px-6 sm:px-8 lg:px-10 pb-8">
          <Breadcrumbs />
          <Outlet />
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
