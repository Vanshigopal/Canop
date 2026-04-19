import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "@/config/db";
import { Errors } from "@/lib/errors";
import { logPlatformAction } from "@/lib/platform-audit";
import { ok } from "@/lib/response";
import {
  requirePlatformAuth,
  signPlatformToken,
} from "@/middleware/platform-auth";

export const platformAuthRouter = Router();

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

platformAuthRouter.post("/login", async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) throw Errors.validationFailed(parsed.error.flatten());
  const { email, password } = parsed.data;

  const admin = await prisma.platformAdmin.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!admin || !admin.isActive) throw Errors.unauthorized("Invalid credentials");

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) throw Errors.unauthorized("Invalid credentials");

  await prisma.platformAdmin.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  const token = signPlatformToken({
    sub: admin.id,
    email: admin.email,
    role: admin.role,
  });

  await logPlatformAction(
    Object.assign(req, { platformAdmin: { id: admin.id } }),
    "platform:login",
    "platform_admin",
    admin.id,
  );

  return ok(res, {
    token,
    admin: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      lastLoginAt: admin.lastLoginAt,
    },
  });
});

platformAuthRouter.get("/me", requirePlatformAuth, async (req, res) => {
  const admin = await prisma.platformAdmin.findUnique({
    where: { id: (req as any).platformAdmin.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });
  if (!admin) throw Errors.notFound("Platform admin");
  return ok(res, admin);
});

platformAuthRouter.post("/logout", requirePlatformAuth, async (req, res) => {
  await logPlatformAction(req, "platform:logout", "platform_admin", (req as any).platformAdmin.id);
  return ok(res, { ok: true });
});
