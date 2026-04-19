import * as Sentry from "@sentry/node";
import { env } from "@/config/env";

let initialized = false;

/**
 * Initializes Sentry with PII scrubbing. No-op if SENTRY_DSN is not set.
 * Must be called BEFORE creating the Express app.
 */
export function initSentry() {
  if (initialized) return;
  if (!env.SENTRY_DSN) {
    console.log("[sentry] No DSN configured, skipping initialization");
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    release: `canop-api@${process.env.npm_package_version || "0.1.0"}`,
    tracesSampleRate: env.NODE_ENV === "production" ? 0.1 : 1.0,
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
        delete event.request.headers["x-api-key"];
        delete event.request.headers["x-tenant-slug"];
      }
      if (event.request?.data && typeof event.request.data === "object") {
        const data = event.request.data as Record<string, unknown>;
        for (const key of ["password", "token", "refreshToken", "otp"]) {
          if (key in data) (data as Record<string, unknown>)[key] = "[REDACTED]";
        }
      }
      return event;
    },
  });

  initialized = true;
  console.log("[sentry] Initialized");
}

export { Sentry };
