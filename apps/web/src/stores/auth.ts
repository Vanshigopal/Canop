import type { AuthPermissions, AuthTenant, AuthUser, LoginResponse } from "@raquel/types";
import { create } from "zustand";
import { api, registerAuthInterceptors } from "@/lib/api";
import { connectSocket, disconnectSocket } from "@/lib/socket";

interface AuthState {
  user: AuthUser | null;
  tenant: AuthTenant | null;
  permissions: AuthPermissions | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  loginWithEmail: (tenantSlug: string, email: string, password: string) => Promise<void>;
  sendOtp: (tenantSlug: string, phone: string) => Promise<string>;
  verifyOtp: (tenantSlug: string, phone: string, otp: string) => Promise<void>;
  refresh: () => Promise<boolean>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  tenant: null,
  permissions: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,

  setTokens: (accessToken, refreshToken) => {
    set({ accessToken, refreshToken, isAuthenticated: true });
    connectSocket(accessToken);
  },

  clear: () => {
    disconnectSocket();
    set({
      user: null,
      tenant: null,
      permissions: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },

  loginWithEmail: async (tenantSlug, email, password) => {
    set({ isLoading: true });
    try {
      const res = await api.post<{ ok: boolean; data: LoginResponse }>("/api/v1/auth/login", {
        tenantSlug,
        email,
        password,
      });
      const { accessToken, refreshToken, user, tenant } = res.data.data;
      set({
        accessToken,
        refreshToken,
        user: { ...user, phone: null, avatarUrl: null, isActive: true, lastLoginAt: null },
        tenant,
        isAuthenticated: true,
      });
      connectSocket(accessToken);
    } finally {
      set({ isLoading: false });
    }
  },

  sendOtp: async (tenantSlug, phone) => {
    const res = await api.post<{ ok: boolean; data: { message: string; phone: string } }>(
      "/api/v1/auth/otp/send",
      { tenantSlug, phone },
    );
    return res.data.data.phone;
  },

  verifyOtp: async (tenantSlug, phone, otp) => {
    set({ isLoading: true });
    try {
      const res = await api.post<{ ok: boolean; data: LoginResponse }>("/api/v1/auth/otp/verify", {
        tenantSlug,
        phone,
        otp,
      });
      const { accessToken, refreshToken, user, tenant } = res.data.data;
      set({
        accessToken,
        refreshToken,
        user: { ...user, phone, avatarUrl: null, isActive: true, lastLoginAt: null },
        tenant,
        isAuthenticated: true,
      });
      connectSocket(accessToken);
    } finally {
      set({ isLoading: false });
    }
  },

  refresh: async () => {
    const { refreshToken } = get();
    if (!refreshToken) return false;
    try {
      const res = await api.post<{
        ok: boolean;
        data: { accessToken: string; refreshToken: string };
      }>("/api/v1/auth/refresh", { refreshToken });
      set({
        accessToken: res.data.data.accessToken,
        refreshToken: res.data.data.refreshToken,
      });
      connectSocket(res.data.data.accessToken);
      return true;
    } catch {
      get().clear();
      return false;
    }
  },

  logout: async () => {
    const { accessToken, refreshToken } = get();
    try {
      if (accessToken) {
        await api.post(
          "/api/v1/auth/logout",
          { refreshToken },
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
      }
    } catch {
      // Ignore logout errors
    }
    get().clear();
  },

  fetchMe: async () => {
    try {
      const res = await api.get<{
        ok: boolean;
        data: { user: AuthUser; permissions: AuthPermissions | null; tenant: AuthTenant };
      }>("/api/v1/auth/me");
      set({
        user: res.data.data.user,
        permissions: res.data.data.permissions,
        tenant: res.data.data.tenant,
      });
    } catch {
      get().clear();
    }
  },
}));

registerAuthInterceptors(
  () => useAuthStore.getState().accessToken,
  () => useAuthStore.getState().refresh(),
  () => useAuthStore.getState().clear(),
);
