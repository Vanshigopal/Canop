/**
 * Extract tenant slug from the current browser hostname.
 * Returns null if no subdomain detected (e.g., plain localhost).
 */
export function getTenantSlug(): string | null {
  const host = window.location.hostname;
  const parts = host.split(".");
  // demo.lvh.me -> "demo"
  // demo.raquel.app -> "demo"
  // localhost -> null
  if (parts.length >= 2) {
    const slug = parts[0];
    if (slug && !["www", "api", "admin", "localhost"].includes(slug)) {
      return slug;
    }
  }
  return null;
}
