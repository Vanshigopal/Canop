import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Add tenant slug header for localhost development
// (in production, the subdomain handles this via tenantMiddleware)
api.interceptors.request.use((config) => {
  const slug = getTenantSlugFromHost();
  if (slug) {
    config.headers["X-Tenant-Slug"] = slug;
  }
  return config;
});

function getTenantSlugFromHost(): string | null {
  const host = window.location.hostname;
  const parts = host.split(".");
  if (parts.length >= 2) {
    const slug = parts[0];
    if (
      slug &&
      !["www", "api", "app", "admin", "localhost"].includes(slug)
    ) {
      return slug;
    }
  }
  return null;
}
