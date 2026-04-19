import * as Sentry from "@sentry/react";

let initialized = false;

/**
 * Initializes Sentry for the web app. No-op if VITE_SENTRY_DSN isn't set.
 */
export function initSentry() {
  if (initialized) return;
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: `raquel-web@${import.meta.env.VITE_APP_VERSION || "0.1.0"}`,
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: import.meta.env.PROD ? 0.5 : 0,
  });

  initialized = true;
}

export { Sentry };
