import cors from "cors";
import { env } from "@/config/env";

const DEV_ALLOWED_PATTERNS = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  /^http:\/\/[a-z0-9-]+\.lvh\.me(:\d+)?$/,
];

const PROD_ALLOWED_PATTERNS: RegExp[] = [
  /^https:\/\/raquel\.app$/,
  /^https:\/\/[a-z0-9-]+\.raquel\.app$/,
];

function isAllowed(origin: string): boolean {
  if (env.NODE_ENV === "production") {
    if (env.CORS_ORIGIN && origin === env.CORS_ORIGIN) return true;
    return PROD_ALLOWED_PATTERNS.some((p) => p.test(origin));
  }
  if (DEV_ALLOWED_PATTERNS.some((p) => p.test(origin))) return true;
  if (env.CORS_ORIGIN && origin === env.CORS_ORIGIN) return true;
  return false;
}

export const corsMiddleware = cors({
  origin: (origin, cb) => {
    // Allow non-browser clients (mobile, curl) — no Origin header
    if (!origin) return cb(null, true);
    if (isAllowed(origin)) return cb(null, true);
    return cb(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Tenant-Slug",
    "X-Api-Key",
    "X-Request-ID",
  ],
  exposedHeaders: ["X-Request-ID"],
  maxAge: 86400,
});
