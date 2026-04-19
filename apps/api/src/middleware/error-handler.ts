import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { env } from "@/config/env";
import { AppError } from "@/lib/errors";

/**
 * Production-grade error handler.
 * - Logs full error internally
 * - Scrubs stack traces in production
 * - Maps Prisma + Zod errors to friendly responses
 * - Preserves AppError shape
 */
export function productionErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  const isDev = env.NODE_ENV === "development";
  const requestId = (req as any).requestId;

  const logPayload = {
    method: req.method,
    path: req.path,
    errorName: err.constructor?.name ?? err.name,
    message: err.message?.substring(0, 300),
    tenantId: (req as any).tenantId,
    userId: (req as any).user?.id,
    requestId,
    ip: req.ip,
    ...(isDev ? { stack: err.stack?.substring(0, 300) } : {}),
  };
  req.log?.error(logPayload, "request error");
  if (!req.log) console.error("[error]", logPayload);

  const withRequestId = (body: { ok: false; error: Record<string, unknown> }) => {
    if (requestId) body.error.requestId = requestId;
    return body;
  };

  if (err instanceof AppError) {
    return res.status(err.statusCode).json(
      withRequestId({
        ok: false,
        error: {
          code: err.code,
          message: err.message,
          ...(err.details && isDev ? { details: err.details } : {}),
        },
      }),
    );
  }

  if (err instanceof ZodError) {
    return res.status(400).json(
      withRequestId({
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          ...(isDev ? { details: err.errors } : {}),
        },
      }),
    );
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json(
        withRequestId({
          ok: false,
          error: {
            code: "DUPLICATE",
            message: "A record with these values already exists.",
          },
        }),
      );
    }
    if (err.code === "P2025") {
      return res.status(404).json(
        withRequestId({
          ok: false,
          error: { code: "NOT_FOUND", message: "Record not found." },
        }),
      );
    }
    if (err.code === "P2003") {
      return res.status(400).json(
        withRequestId({
          ok: false,
          error: {
            code: "INVALID_REFERENCE",
            message: "Referenced record does not exist.",
          },
        }),
      );
    }
  }

  // Prisma validation errors (e.g. invalid UUID format)
  // Check by name instead of instanceof (robust against hot-reload dupes).
  // Also detect by message signature because Prisma throws a plain Error-shaped
  // object in some cases (UUID parse failures in where: {id} queries).
  const errName = err.name || err.constructor?.name;
  const msg = err.message || "";
  const looksLikeValidationError =
    errName === "PrismaClientValidationError" ||
    errName === "PrismaClientUnknownRequestError" ||
    msg.startsWith("Invalid `prisma.") ||
    msg.includes("Inconsistent column data") ||
    msg.includes("Argument") && msg.includes("must be");
  if (err instanceof Prisma.PrismaClientValidationError || looksLikeValidationError) {
    return res.status(400).json(
      withRequestId({
        ok: false,
        error: {
          code: "INVALID_INPUT",
          message: "Invalid request parameters.",
        },
      }),
    );
  }

  if (err.message?.startsWith("CORS:")) {
    return res.status(403).json(
      withRequestId({
        ok: false,
        error: { code: "CORS_BLOCKED", message: "Origin not allowed." },
      }),
    );
  }

  const statusCode = (err as any).status || (err as any).statusCode || 500;
  return res.status(statusCode).json(
    withRequestId({
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: isDev ? err.message : "An unexpected error occurred. Please try again.",
        ...(isDev ? { stack: err.stack } : {}),
      },
    }),
  );
}
