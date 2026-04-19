import { create } from "zustand";

const STORAGE_KEY = "canop:sidebar-collapsed";

interface SidebarState {
  collapsed: boolean;
  mobileOpen: boolean;
  toggle: () => void;
  setCollapsed: (v: boolean) => void;
  setMobileOpen: (v: boolean) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  collapsed: localStorage.getItem(STORAGE_KEY) === "true",
  mobileOpen: false,
  toggle: () =>
    set((s) => {
      const next = !s.collapsed;
      localStorage.setItem(STORAGE_KEY, String(next));
      return { collapsed: next };
    }),
  setCollapsed: (collapsed) => {
    localStorage.setItem(STORAGE_KEY, String(collapsed));
    set({ collapsed });
  },
  setMobileOpen: (mobileOpen) => set({ mobileOpen }),
}));
