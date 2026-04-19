import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "@/config/db";
import { redis } from "@/config/redis";
import { Errors } from "@/lib/errors";
import { logPlatformAction } from "@/lib/platform-audit";
import { created, ok, paginated } from "@/lib/response";
import {
  requirePlatformAuth,
  requirePlatformRole,
} from "@/middleware/platform-auth";
import { checkMLHealth } from "@/services/ml-client.service";

export const platformSystemRouter = Router();
platformSystemRouter.use(requirePlatformAuth);

// ═══ SYSTEM HEALTH (deep) ═══
platformSystemRouter.get("/system/health", async (_req, res) => {
  const checks: Record<string, any> = {};

  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
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
    const pong = await redis.ping();
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
    const mlOk = await checkMLHealth();
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

  const memUsage = process.memoryUsage();

  return ok(res, {
    checks,
    process: {
      uptimeSeconds: Math.round(process.uptime()),
      heapUsedMb: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(memUsage.heapTotal / 1024 / 1024),
      rssMb: Math.round(memUsage.rss / 1024 / 1024),
      nodeVersion: process.version,
      pid: process.pid,
    },
  });
});

platformSystemRouter.get("/system/metrics", async (_req, res) => {
  // Placeholder implementation — hooks into request-logger entries in Session 16.5
  return ok(res, {
    avgResponseTimeMs: null,
    errorRatePct: null,
    requestsPerMinute: null,
    note: "Wire to observability backend (Prometheus, Datadog) for real metrics",
  });
});

// ═══ PLATFORM ADMIN MANAGEMENT ═══
platformSystemRouter.get("/admins", async (_req, res) => {
  const admins = await prisma.platformAdmin.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return ok(res, admins);
});

const CreateAdminSchema = z.object({
  name: z.string().min(2).max(200),
  email: z.string().email(),
  password: z.string().min(10).max(128),
  role: z.enum(["SUPER_ADMIN", "PLATFORM_SUPPORT", "PLATFORM_BILLING"]),
});
platformSystemRouter.post(
  "/admins",
  requirePlatformRole("SUPER_ADMIN"),
  async (req, res) => {
    const parsed = CreateAdminSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validationFailed(parsed.error.flatten());
    const { name, email, password, role } = parsed.data;

    const existing = await prisma.platformAdmin.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existing) throw Errors.badRequest("An admin with that email already exists");

    const hash = await bcrypt.hash(password, 12);
    const admin = await prisma.platformAdmin.create({
      data: {
        email: email.toLowerCase(),
        name,
        passwordHash: hash,
        role,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
    await logPlatformAction(req, "admin:created", "platform_admin", admin.id, {
      email,
      role,
    });
    return created(res, admin);
  },
);

const UpdateAdminSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  role: z.enum(["SUPER_ADMIN", "PLATFORM_SUPPORT", "PLATFORM_BILLING"]).optional(),
  isActive: z.boolean().optional(),
});
platformSystemRouter.patch(
  "/admins/:id",
  requirePlatformRole("SUPER_ADMIN"),
  async (req, res) => {
    const parsed = UpdateAdminSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.validationFailed(parsed.error.flatten());
    const admin = await prisma.platformAdmin.update({
      where: { id: req.params.id as string },
      data: parsed.data,
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });
    await logPlatformAction(req, "admin:updated", "platform_admin", admin.id, parsed.data);
    return ok(res, admin);
  },
);

platformSystemRouter.delete(
  "/admins/:id",
  requirePlatformRole("SUPER_ADMIN"),
  async (req, res) => {
    const admin = (req as any).platformAdmin;
    if (admin.id === req.params.id) {
      throw Errors.badRequest("You cannot delete your own account");
    }

    const superAdminCount = await prisma.platformAdmin.count({
      where: { role: "SUPER_ADMIN", isActive: true },
    });
    const target = await prisma.platformAdmin.findUnique({
      where: { id: req.params.id as string },
    });
    if (!target) throw Errors.notFound("Platform admin");
    if (target.role === "SUPER_ADMIN" && superAdminCount <= 1) {
      throw Errors.badRequest("Cannot remove the last super admin");
    }

    await prisma.platformAdmin.delete({
      where: { id: req.params.id as string },
    });
    await logPlatformAction(req, "admin:deleted", "platform_admin", req.params.id as string);
    return ok(res, { deleted: true });
  },
);

// ═══ AUDIT LOG ═══
platformSystemRouter.get("/audit-logs", async (req, res) => {
  const {
    adminId,
    action,
    targetType,
    dateFrom,
    dateTo,
    page = "1",
    pageSize = "50",
  } = req.query as Record<string, string>;
  const p = Math.max(1, Number(page));
  const ps = Math.min(200, Math.max(1, Number(pageSize)));

  const where: Record<string, unknown> = {};
  if (adminId) where.adminId = adminId;
  if (action) where.action = { contains: action };
  if (targetType) where.targetType = targetType;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) (where.createdAt as any).gte = new Date(dateFrom);
    if (dateTo) (where.createdAt as any).lte = new Date(dateTo);
  }

  const [logs, total] = await Promise.all([
    prisma.platformAuditLog.findMany({
      where,
      include: {
        admin: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (p - 1) * ps,
      take: ps,
    }),
    prisma.platformAuditLog.count({ where }),
  ]);

  return paginated(res, logs, { total, page: p, pageSize: ps });
});
