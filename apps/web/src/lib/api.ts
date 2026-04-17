import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

let getAccessToken: (() => string | null) | null = null;
let doRefresh: (() => Promise<boolean>) | null = null;
let doClear: (() => void) | null = null;

export function registerAuthInterceptors(
  tokenGetter: () => string | null,
  refreshFn: () => Promise<boolean>,
  clearFn: () => void,
) {
  getAccessToken = tokenGetter;
  doRefresh = refreshFn;
  doClear = clearFn;
}

api.interceptors.request.use((config) => {
  const slug = getTenantSlugFromHost();
  if (slug) {
    config.headers["X-Tenant-Slug"] = slug;
  }

  if (getAccessToken) {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: unknown) => void; reject: (e: unknown) => void }> = [];

function processQueue(error: unknown) {
  for (const p of failedQueue) {
    if (error) p.reject(error);
    else p.resolve(undefined);
  }
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (
      error.response?.status !== 401 ||
      original._retry ||
      original.url?.includes("/auth/refresh") ||
      !doRefresh
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(() => api(original));
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const success = await doRefresh();
      if (success) {
        processQueue(null);
        return api(original);
      }
      processQueue(error);
      doClear?.();
      window.location.href = "/login";
      return Promise.reject(error);
    } catch (refreshError) {
      processQueue(refreshError);
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

function getTenantSlugFromHost(): string | null {
  const host = window.location.hostname;
  const parts = host.split(".");
  if (parts.length >= 2) {
    const slug = parts[0];
    if (slug && !["www", "api", "app", "admin", "localhost"].includes(slug)) {
      return slug;
    }
  }
  return null;
}
