import { randomBytes } from "node:crypto";
import { redis } from "@/config/redis";

export const QR_TOKEN_TTL_SECONDS = 20;
export const QR_REFRESH_INTERVAL_SECONDS = 15;

interface QrTokenData {
  sessionId: string;
  tenantId: string;
  issuedAt: number;
}

function tokenKey(token: string) {
  return `qr:${token}`;
}
function sessionCurrentKey(sessionId: string) {
  return `qr:session:${sessionId}:current`;
}

/**
 * Generate a new QR token for a session, invalidating any previous active token.
 * Stores {sessionId, tenantId} in Redis with a 20s TTL.
 */
export async function generateQrToken(sessionId: string, tenantId: string): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const prev = await redis.get(sessionCurrentKey(sessionId));
  if (prev) {
    await redis.del(tokenKey(prev));
  }

  const token = randomBytes(32).toString("hex");
  const data: QrTokenData = { sessionId, tenantId, issuedAt: Date.now() };
  await redis.set(tokenKey(token), JSON.stringify(data), "EX", QR_TOKEN_TTL_SECONDS);
  await redis.set(sessionCurrentKey(sessionId), token, "EX", QR_TOKEN_TTL_SECONDS);

  const expiresAt = new Date(Date.now() + QR_TOKEN_TTL_SECONDS * 1000);
  return { token, expiresAt };
}

/**
 * Look up a QR token in Redis. Returns the session context or null if expired/invalid.
 */
export async function lookupQrToken(token: string): Promise<QrTokenData | null> {
  const raw = await redis.get(tokenKey(token));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as QrTokenData;
  } catch {
    return null;
  }
}

/**
 * Invalidate the current QR for a session (called on finalize or explicit stop).
 */
export async function clearQrToken(sessionId: string): Promise<void> {
  const token = await redis.get(sessionCurrentKey(sessionId));
  if (token) {
    await redis.del(tokenKey(token));
  }
  await redis.del(sessionCurrentKey(sessionId));
}

/**
 * Rate limit key per (session, student) — max attempts guard for brute-force prevention.
 */
export async function incrementScanAttempts(
  sessionId: string,
  studentId: string,
): Promise<number> {
  const key = `qr:attempts:${sessionId}:${studentId}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 300); // 5-minute window
  return count;
}
