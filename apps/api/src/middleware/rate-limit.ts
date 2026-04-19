import type { Express, Request } from "express";
import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { redis } from "@/config/redis";
import { env } from "@/config/env";

function buildStore() {
  if (env.NODE_ENV !== "production") return undefined;
  try {
    return new RedisStore({
      sendCommand: (command: string, ...args: string[]) =>
        (redis as any).call(command, ...args) as Promise<any>,
      prefix: "rl:",
    });
  } catch (err) {
    console.warn("[rate-limit] Redis store unavailable, falling back to memory:", err);
    return undefined;
  }
}

const jsonError = (code: string, message: string) => ({
  ok: false,
  error: { code, message },
});

const skipHealth = (req: Request) =>
  req.path === "/healthz" || req.path === "/health" || req.path === "/ready";

/**
 * Applies layered rate limiting:
 *   - Global: 200/min/IP
 *   - Auth:   10/15min/IP
 *   - OTP:    5/hour/phone-or-IP
 *   - Upload: 20/hour/user
 *   - LLM:    30/min/tenant
 */
export function applyRateLimiting(app: Express) {
  const store = buildStore();

  const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    skip: skipHealth,
    message: jsonError("RATE_LIMIT", "Too many requests. Please slow down."),
    ...(store ? { store } : {}),
    keyGenerator: (req) => req.ip ?? "unknown",
  });
  app.use("/api/", globalLimiter);

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: jsonError(
      "AUTH_RATE_LIMIT",
      "Too many login attempts. Try again in 15 minutes.",
    ),
    ...(store ? { store } : {}),
    keyGenerator: (req) => `auth:${req.ip ?? "unknown"}`,
  });
  app.use("/api/v1/auth/login", authLimiter);
  app.use("/api/v1/auth/otp/send", authLimiter);
  app.use("/api/v1/platform/auth/login", authLimiter);

  const otpLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: jsonError(
      "OTP_RATE_LIMIT",
      "Too many OTP requests for this number.",
    ),
    ...(store ? { store } : {}),
    keyGenerator: (req) => `otp:${req.body?.phone || req.ip || "unknown"}`,
  });
  app.use("/api/v1/auth/otp/send", otpLimiter);

  const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: jsonError("UPLOAD_RATE_LIMIT", "Upload limit reached."),
    ...(store ? { store } : {}),
    keyGenerator: (req) => `upload:${(req as any).user?.id || req.ip}`,
  });
  app.use("/api/v1/materials", uploadLimiter);
  app.use("/api/v1/videos", uploadLimiter);
  app.use("/api/v1/omr/scan", uploadLimiter);

  const llmLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: jsonError("LLM_RATE_LIMIT", "AI request limit reached."),
    ...(store ? { store } : {}),
    keyGenerator: (req) => `llm:${(req as any).tenantId || req.ip}`,
  });
  app.use("/api/v1/ai", llmLimiter);
}
