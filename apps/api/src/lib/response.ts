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
 * Paginated response envelope.
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
