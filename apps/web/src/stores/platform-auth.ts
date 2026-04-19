import axios from "axios";
import { create } from "zustand";
import { persist } from "zustand/middleware";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

export interface PlatformAdmin {
  id: string;
  email: string;
  name: string;
  role: "SUPER_ADMIN" | "PLATFORM_SUPPORT" | "PLATFORM_BILLING";
  lastLoginAt?: string | null;
}

interface PlatformAuthState {
  token: string | null;
  admin: PlatformAdmin | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  clear: () => void;
}

export const platformApi = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

export const usePlatformAuth = create<PlatformAuthState>()(
  persist(
    (set, get) => ({
      token: null,
      admin: null,
      isAuthenticated: false,
      isLoading: false,

      clear: () => set({ token: null, admin: null, isAuthenticated: false }),

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const res = await platformApi.post("/api/v1/platform/auth/login", {
            email,
            password,
          });
          const { token, admin } = res.data.data;
          set({ token, admin, isAuthenticated: true });
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        const { token } = get();
        try {
          if (token) {
            await platformApi.post(
              "/api/v1/platform/auth/logout",
              {},
              { headers: { Authorization: `Bearer ${token}` } },
            );
          }
        } catch {
          // ignore
        }
        get().clear();
      },

      fetchMe: async () => {
        const { token } = get();
        if (!token) return;
        try {
          const res = await platformApi.get("/api/v1/platform/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          set({ admin: res.data.data, isAuthenticated: true });
        } catch {
          get().clear();
        }
      },
    }),
    {
      name: "raquel-platform-token",
      partialize: (s) => ({ token: s.token, admin: s.admin, isAuthenticated: s.isAuthenticated }),
    },
  ),
);

platformApi.interceptors.request.use((config) => {
  const { token } = usePlatformAuth.getState();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

platformApi.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      usePlatformAuth.getState().clear();
      if (typeof window !== "undefined") {
        window.location.href = "/platform-admin/login";
      }
    }
    return Promise.reject(err);
  },
);
