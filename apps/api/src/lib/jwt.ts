import jwt from "jsonwebtoken";
import { env } from "@/config/env";

export interface AccessTokenPayload {
  sub: string;
  tid: string;
  role: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL,
    algorithm: "HS256",
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_SECRET, {
    algorithms: ["HS256"],
  }) as AccessTokenPayload;
}

export function signResetToken(userId: string, tenantId: string): string {
  return jwt.sign({ sub: userId, tid: tenantId, purpose: "reset" }, env.JWT_SECRET, {
    expiresIn: 3600,
    algorithm: "HS256",
  });
}

export function verifyResetToken(token: string): { sub: string; tid: string; purpose: string } {
  const decoded = jwt.verify(token, env.JWT_SECRET, {
    algorithms: ["HS256"],
  }) as { sub: string; tid: string; purpose: string };
  if (decoded.purpose !== "reset") throw new Error("Invalid token purpose");
  return decoded;
}
