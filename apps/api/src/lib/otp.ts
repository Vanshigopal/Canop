import { randomInt } from "node:crypto";
import { redis } from "@/config/redis";
import { env } from "@/config/env";

function otpKey(tenantId: string, phone: string): string {
  return `otp:${tenantId}:${phone}`;
}

function attemptsKey(tenantId: string, phone: string): string {
  return `otp_attempts:${tenantId}:${phone}`;
}

export function generateOTP(): string {
  return String(randomInt(100000, 999999));
}

export async function storeOTP(tenantId: string, phone: string, otp: string): Promise<void> {
  const key = otpKey(tenantId, phone);
  await redis.set(key, otp, "EX", env.OTP_TTL);
  await redis.del(attemptsKey(tenantId, phone));
}

export async function verifyOTP(tenantId: string, phone: string, otp: string): Promise<boolean> {
  const key = otpKey(tenantId, phone);
  const attKey = attemptsKey(tenantId, phone);

  const attempts = await redis.incr(attKey);
  if (attempts === 1) {
    await redis.expire(attKey, env.OTP_TTL);
  }
  if (attempts > 5) return false;

  const stored = await redis.get(key);
  if (!stored) return false;
  return stored === otp;
}

export async function deleteOTP(tenantId: string, phone: string): Promise<void> {
  await redis.del(otpKey(tenantId, phone));
  await redis.del(attemptsKey(tenantId, phone));
}
