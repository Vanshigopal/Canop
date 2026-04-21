import { randomUUID } from "node:crypto";
import { compareSync, hashSync } from "bcryptjs";
import { type NextFunction, type Request, type Response, Router } from "express";
import { z } from "zod";
import { prisma, withTenantTransaction } from "@/config/db";
import { env } from "@/config/env";
import { Errors } from "@/lib/errors";
import { signAccessToken, signResetToken, verifyResetToken } from "@/lib/jwt";
import { deleteOTP, generateOTP, storeOTP, verifyOTP } from "@/lib/otp";
import { STRONG_PASSWORD } from "@/lib/password-policy";
import { ok } from "@/lib/response";
import { authenticate } from "@/middleware/auth";
import { validate } from "@/middleware/validate";

export const authRouter = Router();

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res, next)).catch(next);

// ── Schemas ──────────────────────────────────────────────

const LoginSchema = z.object({
  tenantSlug: z.string().min(3).max(30),
  email: z.string().email(),
  password: z.string().min(1),
});

const OtpSendSchema = z.object({
  tenantSlug: z.string().min(3).max(30),
  phone: z.string().regex(/^\+\d{10,15}$/, "Phone must be in E.164 format"),
});

const OtpVerifySchema = z.object({
  tenantSlug: z.string().min(3).max(30),
  phone: z.string().regex(/^\+\d{10,15}$/),
  otp: z.string().length(6),
});

const RefreshSchema = z.object({
  refreshToken: z.string().uuid(),
});

const ForgotPasswordSchema = z.object({
  tenantSlug: z.string().min(3).max(30),
  email: z.string().email(),
});

const ResetPasswordSchema = z.object({
  token: z.string(),
  password: STRONG_PASSWORD,
});

// ── Helpers ──────────────────────────────────────────────

async function resolveTenant(slug: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { slug, deletedAt: null },
  });
  if (!tenant) throw Errors.tenantNotFound(slug);
  if (tenant.status === "SUSPENDED") throw Errors.tenantSuspended();
  return tenant;
}

async function createSession(userId: string, tenantId: string, role: string, req: Request) {
  const refreshToken = randomUUID();
  const expiresAt = new Date(Date.now() + env.JWT_REFRESH_TTL * 1000);

  await withTenantTransaction(prisma, tenantId, async (tx) => {
    await tx.session.create({
      data: {
        userId,
        tenantId,
        refreshToken,
        userAgent: req.headers["user-agent"]?.slice(0, 500) ?? null,
        ipAddress: (req.ip || req.socket.remoteAddress || "unknown").slice(0, 45),
        expiresAt,
      },
    });
    await tx.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  });

  const accessToken = signAccessToken({ sub: userId, tid: tenantId, role });

  return { accessToken, refreshToken };
}

function userResponse(user: { id: string; email: string; name: string; role: string }) {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

function tenantResponse(tenant: { id: string; slug: string; name: string }) {
  return { id: tenant.id, slug: tenant.slug, name: tenant.name };
}

// ── POST /login ──────────────────────────────────────────

authRouter.post(
  "/login",
  validate(LoginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug, email, password } = req.body;
    const tenant = await resolveTenant(tenantSlug);

    const user = await withTenantTransaction(prisma, tenant.id, (tx) =>
      tx.user.findUnique({
        where: { tenantId_email: { tenantId: tenant.id, email }, deletedAt: null },
      }),
    );

    if (!user) throw Errors.unauthorized("Invalid email or password");

    if (user.role === "STUDENT" || user.role === "PARENT") {
      throw Errors.badRequest("Use phone login for student/parent accounts", "WRONG_AUTH_METHOD");
    }

    if (!user.passwordHash || !compareSync(password, user.passwordHash)) {
      throw Errors.unauthorized("Invalid email or password");
    }

    const tokens = await createSession(user.id, tenant.id, user.role, req);

    return ok(res, {
      ...tokens,
      user: userResponse(user),
      tenant: tenantResponse(tenant),
    });
  }),
);

// ── POST /otp/send ───────────────────────────────────────

authRouter.post(
  "/otp/send",
  validate(OtpSendSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug, phone } = req.body;
    const tenant = await resolveTenant(tenantSlug);

    const user = await prisma.user.findFirst({
      where: { tenantId: tenant.id, phone, deletedAt: null, role: { in: ["STUDENT", "PARENT"] } },
    });

    if (!user) {
      throw Errors.notFound("No account with this phone number found at this institute");
    }

    const otp = generateOTP();
    await storeOTP(tenant.id, phone, otp);

    console.log(`[OTP] ${phone} → ${otp}`);

    const masked = phone.slice(0, -4).replace(/\d/g, "*") + phone.slice(-4);
    return ok(res, { message: "OTP sent", phone: masked });
  }),
);

// ── POST /otp/verify ────────────────────────────────────

authRouter.post(
  "/otp/verify",
  validate(OtpVerifySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug, phone, otp } = req.body;
    const tenant = await resolveTenant(tenantSlug);

    const valid = await verifyOTP(tenant.id, phone, otp);
    if (!valid) throw Errors.unauthorized("Invalid or expired OTP");

    await deleteOTP(tenant.id, phone);

    const user = await prisma.user.findFirst({
      where: { tenantId: tenant.id, phone, deletedAt: null },
    });

    if (!user) throw Errors.notFound("User");

    const tokens = await createSession(user.id, tenant.id, user.role, req);

    return ok(res, {
      ...tokens,
      user: userResponse(user),
      tenant: tenantResponse(tenant),
    });
  }),
);

// ── POST /refresh ────────────────────────────────────────

authRouter.post(
  "/refresh",
  validate(RefreshSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    const session = await prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) await prisma.session.delete({ where: { id: session.id } });
      throw Errors.unauthorized("Session expired");
    }

    await prisma.session.delete({ where: { id: session.id } });

    const newTokens = await createSession(
      session.userId,
      session.tenantId,
      session.user.role,
      req,
    );

    return ok(res, newTokens);
  }),
);

// ── POST /logout ─────────────────────────────────────────

authRouter.post(
  "/logout",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await prisma.session.deleteMany({
        where: { refreshToken, userId: req.user!.id },
      });
    }
    return ok(res, { message: "Logged out" });
  }),
);

// ── POST /logout-all ─────────────────────────────────────

authRouter.post(
  "/logout-all",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    await prisma.session.deleteMany({
      where: { userId: req.user!.id },
    });
    return ok(res, { message: "All sessions revoked" });
  }),
);

// ── GET /me ──────────────────────────────────────────────

authRouter.get(
  "/me",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { permissions: true, tenant: { select: { id: true, slug: true, name: true } } },
    });

    if (!user) throw Errors.notFound("User");

    return ok(res, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
      },
      permissions: user.permissions
        ? {
            canManageFees: user.permissions.canManageFees,
            canApproveAdmissions: user.permissions.canApproveAdmissions,
            canManageExams: user.permissions.canManageExams,
            canManageAttendance: user.permissions.canManageAttendance,
            canManageTimetable: user.permissions.canManageTimetable,
            canSendBroadcasts: user.permissions.canSendBroadcasts,
            canViewAnalytics: user.permissions.canViewAnalytics,
            canManageContent: user.permissions.canManageContent,
          }
        : null,
      tenant: user.tenant,
    });
  }),
);

// ── GET /sessions ────────────────────────────────────────

authRouter.get(
  "/sessions",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const currentRefreshToken = req.headers["x-refresh-token"] as string | undefined;

    const sessions = await prisma.session.findMany({
      where: { userId: req.user!.id, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        expiresAt: true,
        refreshToken: true,
      },
    });

    const mapped = sessions.map((s) => ({
      id: s.id,
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      isCurrent: currentRefreshToken ? s.refreshToken === currentRefreshToken : false,
    }));

    return ok(res, mapped);
  }),
);

// ── DELETE /sessions/:id ─────────────────────────────────

authRouter.delete(
  "/sessions/:id",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    await prisma.session.deleteMany({
      where: { id, userId: req.user!.id },
    });
    return ok(res, { message: "Session revoked" });
  }),
);

// ── POST /device-token ───────────────────────────────────
// Register an FCM/APNS/Web push token for the authenticated user.
// One token per (user, device) — upserts if device already registered.

const DeviceTokenSchema = z.object({
  token: z.string().min(1).max(500),
  platform: z.enum(["android", "ios", "web", "desktop"]),
  deviceId: z.string().min(1).max(100),
});

authRouter.post(
  "/device-token",
  authenticate,
  validate(DeviceTokenSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { token, platform, deviceId } = req.body as z.infer<typeof DeviceTokenSchema>;

    if (!req.tenantId) throw Errors.tenantNotFound("unknown");

    await prisma.deviceToken.upsert({
      where: { userId_deviceId: { userId: req.user!.id, deviceId } },
      update: { token, platform },
      create: {
        tenantId: req.tenantId,
        userId: req.user!.id,
        token,
        platform,
        deviceId,
      },
    });

    return ok(res, { success: true });
  }),
);

// ── DELETE /device-token/:deviceId ───────────────────────

authRouter.delete(
  "/device-token/:deviceId",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const deviceId = req.params.deviceId as string;
    await prisma.deviceToken.deleteMany({
      where: { userId: req.user!.id, deviceId },
    });
    return ok(res, { success: true });
  }),
);

// ── POST /forgot-password ────────────────────────────────

authRouter.post(
  "/forgot-password",
  validate(ForgotPasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { tenantSlug, email } = req.body;
    const tenant = await resolveTenant(tenantSlug);

    const user = await prisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email }, deletedAt: null },
    });

    if (user && (user.role === "ADMIN" || user.role === "TEACHER")) {
      const token = signResetToken(user.id, tenant.id);
      console.log(`[PASSWORD_RESET] ${email} → token: ${token}`);
    }

    return ok(res, { message: "If an account exists, a reset email has been sent" });
  }),
);

// ── POST /reset-password ─────────────────────────────────

authRouter.post(
  "/reset-password",
  validate(ResetPasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { token, password } = req.body;

    let payload: { sub: string; tid: string };
    try {
      payload = verifyResetToken(token);
    } catch {
      throw Errors.unauthorized("Invalid or expired reset token");
    }

    const passwordHash = hashSync(password, 12);
    await prisma.user.update({
      where: { id: payload.sub },
      data: { passwordHash },
    });

    await prisma.session.deleteMany({
      where: { userId: payload.sub },
    });

    return ok(res, { message: "Password reset successful. Please log in again." });
  }),
);
