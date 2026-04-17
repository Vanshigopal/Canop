import type { NextFunction, Request, Response } from "express";
import type { Permission } from "@prisma/client";
import { prisma } from "@/config/db";
import { Errors } from "@/lib/errors";
import { verifyAccessToken } from "@/lib/jwt";

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(Errors.unauthorized());
  }

  try {
    const token = header.slice(7);
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, tenantId: payload.tid, role: payload.role };
    next();
  } catch {
    next(Errors.unauthorized("Invalid or expired token"));
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(Errors.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(Errors.forbidden("Your role does not have access to this resource"));
    }
    next();
  };
}

export function requirePermission(permission: keyof Omit<Permission, "id" | "tenantId" | "userId" | "createdAt" | "updatedAt">) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(Errors.unauthorized());

    try {
      const perms = await prisma.permission.findUnique({
        where: { tenantId_userId: { tenantId: req.user.tenantId, userId: req.user.id } },
      });

      if (!perms || !perms[permission]) {
        return next(Errors.forbidden());
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
