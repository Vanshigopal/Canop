import type { NextFunction, Request, Response } from "express";
import { AppError } from "@/lib/errors";

export function errorMiddleware(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  req.log?.error({ err }, "unhandled error");
  res.status(500).json({
    type: "about:blank",
    title: "Internal Server Error",
    status: 500,
    code: "INTERNAL_ERROR",
    detail:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
}
