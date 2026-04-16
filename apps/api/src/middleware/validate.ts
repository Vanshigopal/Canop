import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { Errors } from "@/lib/errors";

/**
 * Validates request body against a zod schema.
 * Returns 422 with structured errors on failure.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.flatten();
      return next(Errors.validationFailed(details));
    }
    req.body = result.data;
    next();
  };
}
