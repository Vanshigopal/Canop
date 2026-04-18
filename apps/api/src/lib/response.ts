import type { Response } from "express";

/**
 * Standardized success response.
 * All API responses follow this envelope.
 */
export function ok<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({ ok: true, data });
}

export function created<T>(res: Response, data: T) {
  return ok(res, data, 201);
}

export function noContent(res: Response) {
  return res.status(204).end();
}

/**
 * Paginated response envelope — offset-based.
 */
export function paginated<T>(
  res: Response,
  data: T[],
  meta: { total: number; page: number; pageSize: number },
) {
  return res.status(200).json({
    ok: true,
    data,
    meta: {
      ...meta,
      totalPages: Math.ceil(meta.total / meta.pageSize),
    },
  });
}

/**
 * H4 — Cursor-based pagination envelope.
 */
export interface CursorMeta {
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
}

export function cursorPaginated<T>(res: Response, data: T[], meta: CursorMeta) {
  return res.status(200).json({ ok: true, data, meta });
}

export function encodeCursor(id: string, timestamp: Date): string {
  return Buffer.from(`${id}:${timestamp.toISOString()}`).toString("base64url");
}

export function decodeCursor(
  cursor: string,
): { id: string; timestamp: Date } | null {
  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf-8");
    const idx = decoded.indexOf(":");
    if (idx < 0) return null;
    const id = decoded.slice(0, idx);
    const ts = decoded.slice(idx + 1);
    const date = new Date(ts);
    if (!id || Number.isNaN(date.getTime())) return null;
    return { id, timestamp: date };
  } catch {
    return null;
  }
}
