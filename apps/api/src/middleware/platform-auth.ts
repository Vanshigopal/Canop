import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "@/config/env";
import { Errors } from "@/lib/errors";

export interface PlatformTokenPayload {
  sub: string;
  email: string;
  role: string;
  type: "platform";
}

/**
 * Platform JWT — completely separate namespace from tenant JWTs.
 * Distinguished by `type: "platform"` claim.
 */
export function signPlatformToken(payload: Omit<PlatformTokenPayload, "type">) {
  return jwt.sign(
    { ...payload, type: "platform" as const },
    env.JWT_SECRET,
    { expiresIn: "8h", algorithm: "HS256" },
  );
}

export function verifyPlatformToken(token: string): PlatformTokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET, {
    algorithms: ["HS256"],
  }) as PlatformTokenPayload;
  if (decoded.type !== "platform") {
    throw new Error("Not a platform token");
  }
  return decoded;
}

export function requirePlatformAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(Errors.unauthorized("Platform authentication required"));
  }

  try {
    const token = header.slice(7);
    const payload = verifyPlatformToken(token);
    (req as any).platformAdmin = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    next();
  } catch {
    next(Errors.unauthorized("Invalid or expired platform token"));
  }
}

export function requirePlatformRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const admin = (req as any).platformAdmin;
    if (!admin) return next(Errors.unauthorized("Platform authentication required"));
    if (!roles.includes(admin.role)) {
      return next(Errors.forbidden("Insufficient platform permissions"));
    }
    next();
  };
}
