import type { Request } from "express";
import { randomUUID } from "node:crypto";

export interface LogContext {
  requestId: string;
  tenantId?: string;
  userId?: string;
  method: string;
  path: string;
  ip: string;
}

function emit(level: string, message: string, ctx: LogContext, data?: unknown) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...ctx,
    ...(data ? { data } : {}),
  };

  if (process.env.NODE_ENV === "production") {
    console.log(JSON.stringify(entry));
  } else {
    const color =
      level === "ERROR" ? "\x1b[31m" : level === "WARN" ? "\x1b[33m" : "\x1b[36m";
    console.log(
      `${color}[${level}]\x1b[0m ${ctx.method} ${ctx.path} — ${message}`,
    );
  }
}

/**
 * Returns a structured logger bound to the current request.
 */
export function createRequestLogger(req: Request) {
  const requestId =
    (req as any).requestId ||
    (req.headers["x-request-id"] as string) ||
    randomUUID();

  const ctx: LogContext = {
    requestId,
    tenantId: (req as any).tenantId,
    userId: (req as any).user?.id,
    method: req.method,
    path: req.path,
    ip: req.ip || "unknown",
  };

  return {
    info: (msg: string, data?: unknown) => emit("INFO", msg, ctx, data),
    warn: (msg: string, data?: unknown) => emit("WARN", msg, ctx, data),
    error: (msg: string, data?: unknown) => emit("ERROR", msg, ctx, data),
  };
}
