import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { prisma, withTenantTransaction } from "@/config/db";
import { Errors } from "@/lib/errors";
import { logPlatformAction } from "@/lib/platform-audit";
import { STRONG_PASSWORD } from "@/lib/password-policy";
import { created, ok, paginated } from "@/lib/response";
import {
  requirePlatformAuth,
  requirePlatformRole,
} from "@/middleware/platform-auth";

export const platformTenantsRouter = Router();
platformTenantsRouter.use(requirePlatformAuth);

// Plan → limit defaults
const PLAN_LIMITS: Record<
  string,
  {
    maxStudents: number;
    maxTeachers: number;
    maxBatches: number;
    maxStorageGb: number;
    monthlyPriceInr: number;
    aiEnabled: boolean;
    omrEnabled: boolean;
    videoEnabled: boolean;
    whatsappEnabled: boolean;
  }
> = {
  FREE_TRIAL: {
    maxStudents: 50,
    maxTeachers: 5,
    maxBatches: 5,
    maxStorageGb: 5,
    monthlyPriceInr: 0,
    aiEnabled: false,
    omrEnabled: false,
    videoEnabled: false,
    whatsappEnabled: false,
  },
  STARTER: {
    maxStudents: 100,
    maxTeachers: 5,
    maxBatches: 10,
    maxStorageGb: 10,
    monthlyPriceInr: 2999,
    aiEnabled: false,
    omrEnabled: true,
    videoEnabled: false,
    whatsappEnabled: true,
  },
  GROWTH: {
    maxStudents: 500,
    maxTeachers: 15,
    maxBatches: 25,
    maxStorageGb: 25,
    monthlyPriceInr: 7999,
    aiEnabled: true,
    omrEnabled: true,
    videoEnabled: true,
    whatsappEnabled: true,
  },
  PROFESSIONAL: {
    maxStudents: 2000,
    maxTeachers: 50,
    maxBatches: 100,
    maxStorageGb: 100,
    monthlyPriceInr: 14999,
    aiEnabled: true,
    omrEnabled: true,
    videoEnabled: true,
    whatsappEnabled: true,
  },
  ENTERPRISE: {
    maxStudents: 99_999,
    maxTeachers: 9999,
    maxBatches: 9999,
    maxStorageGb: 1000,
    monthlyPriceInr: 0,
    aiEnabled: true,
    omrEnabled: true,
    videoEnabled: true,
    whatsappEnabled: true,
  },
  CUSTOM: {
    maxStudents: 500,
    maxTeachers: 15,
    maxBatches: 25,
    maxStorageGb: 25,
    monthlyPriceInr: 0,
    aiEnabled: true,
    omrEnabled: true,
    videoEnabled: true,
    whatsappEnabled: true,
  },
};

type PlanKey = keyof typeof PLAN_LIMITS;

// ═══ LIST & SEARCH ═══
platformTenantsRouter.get("/", async (req, res) => {
  const {
    search,
    status,
    plan,
    sortBy = "createdAt",
    page = "1",
    pageSize = "50",
  } = req.query as Record<string, string>;
  const p = Math.max(1, Number(page));
  const ps = Math.min(100, Math.max(1, Number(pageSize)));

  const where: Record<string, unknown> = { deletedAt: null };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
    ];
  }
  if (status) where.status = status;

  const orderBy =
    sortBy === "name" ? { name: "asc" as const } : { createdAt: "desc" as const };

  const [tenants, total] = await Promise.all([
    prisma.tenant.findMany({
      where,
      include: {
        subscription: true,
        _count: { select: { students: true, users: true, batches: true } },
        users: {
          where: { role: "ADMIN", deletedAt: null },
          select: { id: true, name: true, email: true },
          take: 1,
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy,
      skip: (p - 1) * ps,
      take: ps,
    }),
    prisma.tenant.count({ where }),
  ]);

  let filtered = tenants;
  if (plan) {
    filtered = tenants.filter((t) => t.subscription?.plan === plan);
  }

  const rows = filtered.map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    status: t.status,
    tier: t.tier,
    plan: t.subscription?.plan ?? null,
    subscriptionStatus: t.subscription?.status ?? null,
    maxStudents: t.subscription?.maxStudents ?? null,
    maxTeachers: t.subscription?.maxTeachers ?? null,
    monthlyPriceInr: t.subscription?.monthlyPriceInr ?? 0,
    totalPaidInr: t.subscription?.totalPaidInr ?? 0,
    trialEndsAt: t.subscription?.trialEndsAt,
    studentCount: t._count.students,
    userCount: t._count.users,
    batchCount: t._count.batches,
    owner: t.users[0] ?? null,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }));

  return paginated(res, rows, { total, page: p, pageSize: ps });
});

// ═══ DETAIL ═══
platformTenantsRouter.get("/:id", async (req, res) => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: req.params.id as string },
    include: {
      subscription: true,
      users: {
        where: { role: "ADMIN", deletedAt: null },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          lastLoginAt: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      },
      _count: {
        select: {
          users: true,
          students: true,
          batches: true,
          classes: true,
          exams: true,
        },
      },
      platformRevenue: {
        orderBy: { month: "desc" },
        take: 12,
      },
    },
  });
  if (!tenant) throw Errors.notFound("Tenant");

  return ok(res, tenant);
});

// ═══ CREATE ═══
const CreateTenantSchema = z.object({
  tenantName: z.string().min(2).max(200),
  slug: z
    .string()
    .min(2)
    .max(30)
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, digits, hyphens"),
  ownerName: z.string().min(2).max(200),
  ownerEmail: z.string().email(),
  ownerPassword: STRONG_PASSWORD,
  plan: z.enum(["FREE_TRIAL", "STARTER", "GROWTH", "PROFESSIONAL", "ENTERPRISE", "CUSTOM"]),
  trialDays: z.number().int().min(0).max(365).optional(),
});

platformTenantsRouter.post("/", async (req, res) => {
  const parsed = CreateTenantSchema.safeParse(req.body);
  if (!parsed.success) throw Errors.validationFailed(parsed.error.flatten());
  const body = parsed.data;

  const existing = await prisma.tenant.findUnique({
    where: { slug: body.slug },
  });
  if (existing) throw Errors.badRequest("That slug is already taken", "SLUG_TAKEN");

  const limits = PLAN_LIMITS[body.plan];
  const hashed = await bcrypt.hash(body.ownerPassword, 12);

  const now = new Date();
  const trialEndsAt =
    body.plan === "FREE_TRIAL"
      ? new Date(now.getTime() + (body.trialDays ?? 14) * 86400000)
      : null;

  const result = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        slug: body.slug.toLowerCase(),
        name: body.tenantName,
        status: body.plan === "FREE_TRIAL" ? "TRIAL" : "ACTIVE",
        tier: body.plan === "PROFESSIONAL" || body.plan === "ENTERPRISE" ? "PROFESSIONAL" : body.plan === "GROWTH" ? "PROFESSIONAL" : "BASIC",
      },
    });

    const owner = await tx.user.create({
      data: {
        tenantId: tenant.id,
        email: body.ownerEmail.toLowerCase(),
        passwordHash: hashed,
        name: body.ownerName,
        role: "ADMIN",
        isActive: true,
      },
    });

    await tx.permission.create({
      data: {
        tenantId: tenant.id,
        userId: owner.id,
        canManageFees: true,
        canApproveAdmissions: true,
        canManageExams: true,
        canManageAttendance: true,
        canManageTimetable: true,
        canSendBroadcasts: true,
        canViewAnalytics: true,
        canManageContent: true,
      },
    });

    await tx.tenantSubscription.create({
      data: {
        tenantId: tenant.id,
        plan: body.plan,
        status: body.plan === "FREE_TRIAL" ? "TRIAL" : "ACTIVE",
        ...limits,
        trialEndsAt,
        currentPeriodStart: now,
        currentPeriodEnd: new Date(now.getTime() + 30 * 86400000),
      },
    });

    await tx.lLMConfig.create({
      data: { tenantId: tenant.id, mode: "DISABLED" },
    });

    return { tenant, owner };
  });

  await logPlatformAction(req, "tenant:created", "tenant", result.tenant.id, {
    slug: body.slug,
    plan: body.plan,
    ownerEmail: body.ownerEmail,
  });

  return created(res, {
    tenant: result.tenant,
    owner: {
      id: result.owner.id,
      email: result.owner.email,
      name: result.owner.name,
    },
    loginUrl: `https://${body.slug}.raquel.app`,
  });
});

// ═══ UPDATE ═══
const UpdateTenantSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  tagline: z.string().max(300).optional(),
  timezone: z.string().max(50).optional(),
});
platformTenantsRouter.patch("/:id", async (req, res) => {
  const parsed = UpdateTenantSchema.safeParse(req.body);
  if (!parsed.success) throw Errors.validationFailed(parsed.error.flatten());
  const tenant = await prisma.tenant.update({
    where: { id: req.params.id as string },
    data: parsed.data,
  });
  await logPlatformAction(req, "tenant:updated", "tenant", tenant.id, parsed.data);
  return ok(res, tenant);
});

// ═══ SUSPEND ═══
platformTenantsRouter.post("/:id/suspend", async (req, res) => {
  const tenant = await prisma.tenant.update({
    where: { id: req.params.id as string },
    data: { status: "SUSPENDED" },
  });
  if (tenant) {
    await prisma.$executeRawUnsafe(
      `UPDATE "tenant_subscriptions" SET status='SUSPENDED'::"SubscriptionStatus", "updated_at"=NOW() WHERE tenant_id='${tenant.id}'::uuid`,
    );
  }
  await logPlatformAction(req, "tenant:suspended", "tenant", tenant.id);
  return ok(res, tenant);
});

// ═══ REACTIVATE ═══
platformTenantsRouter.post("/:id/reactivate", async (req, res) => {
  const tenant = await prisma.tenant.update({
    where: { id: req.params.id as string },
    data: { status: "ACTIVE" },
  });
  if (tenant) {
    await prisma.$executeRawUnsafe(
      `UPDATE "tenant_subscriptions" SET status='ACTIVE'::"SubscriptionStatus", "updated_at"=NOW() WHERE tenant_id='${tenant.id}'::uuid`,
    );
  }
  await logPlatformAction(req, "tenant:reactivated", "tenant", tenant.id);
  return ok(res, tenant);
});

// ═══ DELETE (dangerous) ═══
platformTenantsRouter.delete(
  "/:id",
  requirePlatformRole("SUPER_ADMIN"),
  async (req, res) => {
    const id = req.params.id as string;
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw Errors.notFound("Tenant");

    const confirm = req.body?.confirm;
    if (confirm !== `DELETE ${tenant.slug}`) {
      throw Errors.badRequest(
        `Confirmation required. Send { confirm: "DELETE ${tenant.slug}" }`,
        "CONFIRMATION_REQUIRED",
      );
    }

    await prisma.tenant.delete({ where: { id } });
    await logPlatformAction(req, "tenant:deleted", "tenant", id, {
      slug: tenant.slug,
      name: tenant.name,
    });
    return ok(res, { deleted: true });
  },
);

// ═══ OWNERS ═══
platformTenantsRouter.get("/:id/owners", async (req, res) => {
  const owners = await prisma.user.findMany({
    where: {
      tenantId: req.params.id as string,
      role: "ADMIN",
      deletedAt: null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
  return ok(res, owners);
});

const AddOwnerSchema = z.object({
  name: z.string().min(2).max(200),
  email: z.string().email(),
  password: STRONG_PASSWORD,
  phone: z.string().max(15).optional(),
});
platformTenantsRouter.post("/:id/owners", async (req, res) => {
  const parsed = AddOwnerSchema.safeParse(req.body);
  if (!parsed.success) throw Errors.validationFailed(parsed.error.flatten());
  const { name, email, password, phone } = parsed.data;
  const tenantId = req.params.id as string;

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw Errors.notFound("Tenant");

  const existing = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId, email: email.toLowerCase() } },
  });
  if (existing) throw Errors.badRequest("A user with that email already exists");

  const hash = await bcrypt.hash(password, 12);
  const owner = await withTenantTransaction(prisma, tenantId, async (tx) => {
    const u = await tx.user.create({
      data: {
        tenantId,
        email: email.toLowerCase(),
        name,
        passwordHash: hash,
        role: "ADMIN",
        phone: phone ?? null,
      },
    });
    await tx.permission.create({
      data: {
        tenantId,
        userId: u.id,
        canManageFees: true,
        canApproveAdmissions: true,
        canManageExams: true,
        canManageAttendance: true,
        canManageTimetable: true,
        canSendBroadcasts: true,
        canViewAnalytics: true,
        canManageContent: true,
      },
    });
    return u;
  });

  await logPlatformAction(req, "owner:added", "user", owner.id, { tenantId });
  return created(res, {
    id: owner.id,
    email: owner.email,
    name: owner.name,
  });
});

platformTenantsRouter.delete("/:id/owners/:userId", async (req, res) => {
  const { id: tenantId, userId } = req.params as { id: string; userId: string };

  const owners = await prisma.user.count({
    where: { tenantId, role: "ADMIN", deletedAt: null, isActive: true },
  });
  if (owners <= 1) {
    throw Errors.badRequest(
      "Cannot remove the last active owner. At least one admin must remain.",
      "LAST_OWNER",
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: { deletedAt: new Date(), isActive: false },
  });
  await logPlatformAction(req, "owner:removed", "user", userId, { tenantId });
  return ok(res, { removed: true });
});

platformTenantsRouter.post(
  "/:id/owners/:userId/reset-password",
  async (req, res) => {
    const { userId } = req.params as { id: string; userId: string };
    const newPass = randomBytes(9).toString("base64url");
    const hash = await bcrypt.hash(newPass, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hash },
    });
    await logPlatformAction(req, "owner:password-reset", "user", userId);
    return ok(res, { password: newPass });
  },
);

// ═══ SUBSCRIPTION ═══
platformTenantsRouter.get("/:id/subscription", async (req, res) => {
  const sub = await prisma.tenantSubscription.findUnique({
    where: { tenantId: req.params.id as string },
  });
  return ok(res, sub);
});

const UpdateSubscriptionSchema = z.object({
  plan: z
    .enum(["FREE_TRIAL", "STARTER", "GROWTH", "PROFESSIONAL", "ENTERPRISE", "CUSTOM"])
    .optional(),
  status: z
    .enum(["ACTIVE", "TRIAL", "PAST_DUE", "SUSPENDED", "CANCELLED", "EXPIRED"])
    .optional(),
  maxStudents: z.number().int().min(1).optional(),
  maxTeachers: z.number().int().min(1).optional(),
  maxBatches: z.number().int().min(1).optional(),
  maxStorageGb: z.number().int().min(1).optional(),
  aiEnabled: z.boolean().optional(),
  omrEnabled: z.boolean().optional(),
  videoEnabled: z.boolean().optional(),
  analyticsEnabled: z.boolean().optional(),
  whatsappEnabled: z.boolean().optional(),
  monthlyPriceInr: z.number().min(0).optional(),
});
platformTenantsRouter.patch("/:id/subscription", async (req, res) => {
  const parsed = UpdateSubscriptionSchema.safeParse(req.body);
  if (!parsed.success) throw Errors.validationFailed(parsed.error.flatten());
  const tenantId = req.params.id as string;

  const data: Record<string, unknown> = { ...parsed.data };

  if (parsed.data.plan) {
    const limits = PLAN_LIMITS[parsed.data.plan as PlanKey];
    for (const k of ["maxStudents", "maxTeachers", "maxBatches", "maxStorageGb", "aiEnabled", "omrEnabled", "videoEnabled", "whatsappEnabled", "monthlyPriceInr"] as const) {
      if ((parsed.data as any)[k] === undefined) {
        (data as any)[k] = (limits as any)[k];
      }
    }
  }

  const sub = await prisma.tenantSubscription.upsert({
    where: { tenantId },
    update: data,
    create: {
      tenantId,
      plan: (parsed.data.plan ?? "FREE_TRIAL") as any,
      status: (parsed.data.status ?? "TRIAL") as any,
      ...PLAN_LIMITS[(parsed.data.plan ?? "FREE_TRIAL") as PlanKey],
      ...data,
    } as any,
  });

  await logPlatformAction(req, "subscription:updated", "subscription", sub.id, parsed.data);
  return ok(res, sub);
});

const ExtendTrialSchema = z.object({ days: z.number().int().min(1).max(180) });
platformTenantsRouter.post("/:id/subscription/extend-trial", async (req, res) => {
  const parsed = ExtendTrialSchema.safeParse(req.body);
  if (!parsed.success) throw Errors.validationFailed(parsed.error.flatten());
  const tenantId = req.params.id as string;

  const sub = await prisma.tenantSubscription.findUnique({ where: { tenantId } });
  if (!sub) throw Errors.notFound("Subscription");

  const base = sub.trialEndsAt ?? new Date();
  const newEnd = new Date(base.getTime() + parsed.data.days * 86400000);

  const updated = await prisma.tenantSubscription.update({
    where: { tenantId },
    data: { trialEndsAt: newEnd, status: "TRIAL" },
  });
  await logPlatformAction(req, "subscription:trial-extended", "subscription", updated.id, {
    days: parsed.data.days,
    newEnd,
  });
  return ok(res, updated);
});

// ═══ FEATURES (shortcut) ═══
const FeatureSchema = z.object({
  aiEnabled: z.boolean().optional(),
  omrEnabled: z.boolean().optional(),
  videoEnabled: z.boolean().optional(),
  whatsappEnabled: z.boolean().optional(),
  analyticsEnabled: z.boolean().optional(),
});
platformTenantsRouter.patch("/:id/features", async (req, res) => {
  const parsed = FeatureSchema.safeParse(req.body);
  if (!parsed.success) throw Errors.validationFailed(parsed.error.flatten());
  const tenantId = req.params.id as string;

  const sub = await prisma.tenantSubscription.update({
    where: { tenantId },
    data: parsed.data,
  });
  await logPlatformAction(req, "features:toggled", "subscription", sub.id, parsed.data);
  return ok(res, sub);
});
