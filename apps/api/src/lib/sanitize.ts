import sanitizeHtml from "sanitize-html";
import type { NextFunction, Request, Response } from "express";

/**
 * J2 — HTML sanitization, allowlist-based.
 */
const STRICT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [],
  allowedAttributes: {},
};

const BASIC_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["b", "i", "em", "strong", "br"],
  allowedAttributes: {},
};

/** Fields exempt from strict sanitization (allow basic HTML). */
const BASIC_FIELDS = new Set([
  "body",
  "template",
  "description",
  "message",
  "note",
  "rejection_note",
  "rejectionNote",
]);

export function sanitizeStrict(input: string): string {
  return sanitizeHtml(input, STRICT_OPTIONS);
}

export function sanitizeBasic(input: string): string {
  return sanitizeHtml(input, BASIC_OPTIONS);
}

function sanitizeObject(obj: Record<string, unknown>): void {
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === "string") {
      obj[key] = BASIC_FIELDS.has(key) ? sanitizeBasic(val) : sanitizeStrict(val);
    } else if (Array.isArray(val)) {
      for (let i = 0; i < val.length; i++) {
        const item = val[i];
        if (typeof item === "string") {
          val[i] = BASIC_FIELDS.has(key) ? sanitizeBasic(item) : sanitizeStrict(item);
        } else if (item && typeof item === "object") {
          sanitizeObject(item as Record<string, unknown>);
        }
      }
    } else if (val && typeof val === "object") {
      sanitizeObject(val as Record<string, unknown>);
    }
  }
}

export function sanitizeRequestMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  if (req.body && typeof req.body === "object" && !Array.isArray(req.body)) {
    sanitizeObject(req.body as Record<string, unknown>);
  }
  next();
}
