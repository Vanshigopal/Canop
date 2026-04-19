import { type Request, type Response, Router } from "express";
import { prisma } from "@/config/db";
import { redis } from "@/config/redis";
import { checkMLHealth } from "@/services/ml-client.service";

export const healthRouter = Router();

type CheckResult = { status: "ok" | "degraded" | "error" | "unavailable"; latencyMs?: number; error?: string };

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms),
    ),
  ]);
}

// Fast liveness probe — no I/O. <100ms.
healthRouter.get("/healthz", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Readiness probe — DB only.
healthRouter.get("/ready", async (_req: Request, res: Response) => {
  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, 3000);
    res.status(200).json({ ready: true });
  } catch {
    res.status(503).json({ ready: false });
  }
});

// Deep health — DB + Redis + ML service.
healthRouter.get("/health", async (_req: Request, res: Response) => {
  const checks: Record<string, CheckResult> = {};

  const dbStart = Date.now();
  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, 5000);
    checks.database = { status: "ok", latencyMs: Date.now() - dbStart };
  } catch (err: any) {
    checks.database = {
      status: "error",
      latencyMs: Date.now() - dbStart,
      error: err.message,
    };
  }

  const redisStart = Date.now();
  try {
    const pong = await withTimeout(redis.ping(), 3000);
    checks.redis = {
      status: pong === "PONG" ? "ok" : "degraded",
      latencyMs: Date.now() - redisStart,
    };
  } catch (err: any) {
    checks.redis = {
      status: "error",
      latencyMs: Date.now() - redisStart,
      error: err.message,
    };
  }

  const mlStart = Date.now();
  try {
    const mlOk = await withTimeout(checkMLHealth(), 5000);
    checks.mlService = {
      status: mlOk ? "ok" : "degraded",
      latencyMs: Date.now() - mlStart,
    };
  } catch (err: any) {
    checks.mlService = {
      status: "unavailable",
      latencyMs: Date.now() - mlStart,
      error: err.message,
    };
  }

  const critical = [checks.database, checks.redis];
  const allCriticalOk = critical.every((c) => c.status === "ok");

  res.status(allCriticalOk ? 200 : 503).json({
    status: allCriticalOk ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "0.1.0",
    uptimeSeconds: Math.round(process.uptime()),
    environment: process.env.NODE_ENV,
    checks,
  });
});
