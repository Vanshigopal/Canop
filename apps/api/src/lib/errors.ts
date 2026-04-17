export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }

  toJSON() {
    return {
      type: "about:blank",
      title: this.message,
      status: this.statusCode,
      code: this.code,
      ...(this.details ? { details: this.details } : {}),
    };
  }
}

// Factory helpers
export const Errors = {
  tenantNotFound: (slug: string) =>
    new AppError(
      404,
      "TENANT_NOT_FOUND",
      `No institute found at '${slug}.raquel.app'`,
    ),
  tenantSuspended: () =>
    new AppError(403, "TENANT_SUSPENDED", "This institute has been suspended"),
  invalidSubdomain: () =>
    new AppError(
      400,
      "INVALID_SUBDOMAIN",
      "Could not determine institute from URL",
    ),
  validationFailed: (details: unknown) =>
    new AppError(422, "VALIDATION_FAILED", "Invalid request data", details),
  unauthorized: (msg = "Authentication required") =>
    new AppError(401, "UNAUTHORIZED", msg),
  badRequest: (msg: string, code = "BAD_REQUEST") =>
    new AppError(400, code, msg),
  forbidden: (msg = "You don't have permission for this action") =>
    new AppError(403, "FORBIDDEN", msg),
  notFound: (entity: string) =>
    new AppError(404, "NOT_FOUND", `${entity} not found`),
  internal: (msg = "Something went wrong") =>
    new AppError(500, "INTERNAL_ERROR", msg),
};
