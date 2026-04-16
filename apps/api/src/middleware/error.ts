import type { NextFunction, Request, Response } from "express";

export function errorMiddleware(err: Error, req: Request, res: Response, _next: NextFunction) {
  req.log.error({ err }, "unhandled error");
  res.status(500).json({
    type: "about:blank",
    title: "Internal Server Error",
    status: 500,
    detail: err.message,
  });
}
