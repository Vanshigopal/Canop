import type { NextFunction, Request, Response } from "express";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates specified path/query params are valid UUIDs.
 * Returns 400 with a clear error before the route handler runs,
 * preventing raw Prisma validation errors from leaking internal paths.
 *
 * Usage:
 *   router.get("/:id", validateUUIDParams("id"), handler);
 *   router.get("/:id/subjects/:subjectId", validateUUIDParams("id", "subjectId"), handler);
 */
export function validateUUIDParams(...paramNames: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const name of paramNames) {
      const value = req.params[name];
      if (value && typeof value === "string" && !UUID_REGEX.test(value)) {
        return res.status(400).json({
          ok: false,
          error: {
            code: "INVALID_ID",
            message: `${name} must be a valid UUID`,
            requestId: (req as any).requestId,
          },
        });
      }
    }
    next();
  };
}

/**
 * Register param handlers on an Express app/router so that any route
 * referencing :id or :*Id gets automatic UUID validation — returns a clean 400
 * BEFORE the route handler runs (prevents raw Prisma validation errors from
 * leaking internal paths).
 *
 * Usage: registerUUIDParamValidators(app);
 */
export function registerUUIDParamValidators(app: {
  param: (name: string, handler: (req: Request, res: Response, next: NextFunction, value: string) => void) => void;
}) {
  const commonIds = [
    "id",
    "studentId",
    "teacherId",
    "userId",
    "batchId",
    "classId",
    "subjectId",
    "examId",
    "tenantId",
    "deviceId",
    "childId",
    "sessionId",
    "assignmentId",
    "videoId",
    "materialId",
    "submissionId",
    "feePlanId",
    "installmentId",
    "paymentId",
    "templateId",
    "broadcastId",
    "retestId",
    "joinRequestId",
  ];
  const handler = (req: Request, res: Response, next: NextFunction, value: string) => {
    if (value && typeof value === "string" && !UUID_REGEX.test(value)) {
      return res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_ID",
          message: "Invalid ID format — must be a valid UUID",
          requestId: (req as any).requestId,
        },
      });
    }
    next();
  };
  for (const name of commonIds) {
    app.param(name, handler);
  }
}
