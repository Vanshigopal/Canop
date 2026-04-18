import { createHash } from "node:crypto";
import { prisma } from "@/config/db";

/**
 * I2 — Message deduplication.
 *
 * SHA-256 keyed on (tenantId, recipientId, eventType, body).
 * Within a 1-hour window, identical messages are skipped.
 */
const WINDOW_MS = 60 * 60 * 1000;

export function computeDedupKey(
  tenantId: string,
  recipientId: string,
  eventType: string,
  body: string,
): string {
  return createHash("sha256")
    .update(`${tenantId}|${recipientId}|${eventType}|${body}`)
    .digest("hex");
}

export async function isDuplicate(
  tenantId: string,
  recipientId: string,
  eventType: string,
  body: string,
): Promise<{ duplicate: boolean; key: string }> {
  const key = computeDedupKey(tenantId, recipientId, eventType, body);
  const existing = await prisma.messageDedupKey.findUnique({
    where: { hashKey: key },
  });
  if (existing && existing.expiresAt > new Date()) {
    return { duplicate: true, key };
  }
  return { duplicate: false, key };
}

export async function recordDedupKey(
  tenantId: string,
  key: string,
): Promise<void> {
  const expiresAt = new Date(Date.now() + WINDOW_MS);
  await prisma.messageDedupKey.upsert({
    where: { hashKey: key },
    update: { expiresAt },
    create: { tenantId, hashKey: key, expiresAt },
  });
}

/**
 * Cleanup expired dedup keys. Call periodically from a cron job.
 */
export async function cleanupExpiredDedupKeys(): Promise<number> {
  const res = await prisma.messageDedupKey.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return res.count;
}
