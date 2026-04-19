import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

/**
 * Attaches a request ID, logs response with timing and context.
 * Skips noisy health endpoints in production.
 */
export function requestLoggerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const requestId = (req.headers["x-request-id"] as string) || randomUUID();
  const start = Date.now();

  (req as any).requestId = requestId;
  res.setHeader("X-Request-ID", requestId);

  res.on("finish", () => {
    const duration = Date.now() - start;
    const isHealth =
      req.path === "/healthz" || req.path === "/health" || req.path === "/ready";

    if (process.env.NODE_ENV === "production") {
      if (isHealth) return;
      const entry = {
        timestamp: new Date().toISOString(),
        level: res.statusCode >= 500 ? "ERROR" : res.statusCode >= 400 ? "WARN" : "INFO",
        requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: duration,
        ip: req.ip,
        userAgent: req.headers["user-agent"]?.substring(0, 200),
        tenantId: (req as any).tenantId,
        userId: (req as any).user?.id,
      };
      console.log(JSON.stringify(entry));
    }
  });

  next();
}
