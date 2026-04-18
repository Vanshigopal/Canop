import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import { format } from "date-fns";
import { z } from "zod";
import { prisma, withTenantTransaction } from "@/config/db";
import { Errors } from "@/lib/errors";
import { ok } from "@/lib/response";
import { buildAttendanceCalendar, buildStudentDashboard } from "@/lib/dashboard-builder";
import { authenticate, requireRole } from "@/middleware/auth";

export const parentPortalRouter = Router();

parentPortalRouter.use(authenticate, requireRole("PARENT"));

parentPortalRouter.get("/children", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const guardianships = await prisma.guardian.findMany({
    where: {
      tenantId,
      userId: req.user!.id,
      student: { deletedAt: null },
    },
    include: {
      student: {
        include: {
          user: { select: { id: true, name: true, phone: true, avatarUrl: true } },
          batch: {
            select: {
              id: true,
              name: true,
              class: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { isEmergency: "desc" },
  });

  return ok(
    res,
    guardianships.map((g) => ({
      id: g.student.id,
      name: g.student.user.name,
      phone: g.student.user.phone,
      avatarUrl: g.student.user.avatarUrl,
      rollNumber: g.student.rollNumber,
      batchName: g.student.batch?.name ?? null,
      className: g.student.batch?.class?.name ?? null,
      relationship: g.relation,
      isEmergency: g.isEmergency,
    })),
  );
});

/**
 * Middleware that verifies the authenticated PARENT is linked to the
 * :childId in the path. Attaches `req.childId` on success.
 */
async function requireChildAccess(req: Request, _res: Response, next: NextFunction) {
  try {
    const childId = req.params.childId as string | undefined;
    if (!childId) return next(Errors.badRequest("childId required"));

    const guardian = await prisma.guardian.findFirst({
      where: {
        tenantId: req.user!.tenantId,
        userId: req.user!.id,
        studentId: childId,
      },
      select: { id: true },
    });
    if (!guardian) return next(Errors.forbidden("Not authorized for this child"));
    next();
  } catch (err) {
    next(err);
  }
}

parentPortalRouter.get("/children/:childId/dashboard", requireChildAccess, async (req, res) => {
  const tenantId = req.user!.tenantId;
  const childId = req.params.childId as string;

  const dashboard = await withTenantTransaction(prisma, tenantId, (tx) =>
    buildStudentDashboard(tx, tenantId, childId, req.user!.id),
  );
  if (!dashboard) throw Errors.notFound("Student");
  return ok(res, dashboard);
});

parentPortalRouter.get(
  "/children/:childId/attendance-calendar",
  requireChildAccess,
  async (req, res) => {
    const tenantId = req.user!.tenantId;
    const childId = req.params.childId as string;
    const month = (req.query.month as string) || format(new Date(), "yyyy-MM");
    if (!/^\d{4}-\d{2}$/.test(month)) throw Errors.badRequest("month must be YYYY-MM");

    const calendar = await withTenantTransaction(prisma, tenantId, (tx) =>
      buildAttendanceCalendar(tx, tenantId, childId, month),
    );
    return ok(res, calendar);
  },
);

parentPortalRouter.get("/children/:childId/profile", requireChildAccess, async (req, res) => {
  const tenantId = req.user!.tenantId;
  const childId = req.params.childId as string;
  const student = await prisma.student.findFirst({
    where: { id: childId, tenantId, deletedAt: null },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
      batch: { select: { id: true, name: true, class: { select: { name: true } } } },
    },
  });
  if (!student) throw Errors.notFound("Student");

  return ok(res, {
    id: student.id,
    name: student.user.name,
    email: student.user.email,
    phone: student.user.phone,
    avatarUrl: student.user.avatarUrl,
    rollNumber: student.rollNumber,
    dateOfBirth: student.dateOfBirth,
    gender: student.gender,
    bloodGroup: student.bloodGroup,
    address: student.address,
    city: student.city,
    state: student.state,
    pincode: student.pincode,
    enrolledAt: student.enrolledAt,
    batch: student.batch,
  });
});

parentPortalRouter.get("/me", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const user = await prisma.user.findFirst({
    where: { id: req.user!.id, tenantId },
    select: { id: true, name: true, email: true, phone: true, avatarUrl: true },
  });
  if (!user) throw Errors.notFound("User");

  const guardians = await prisma.guardian.findMany({
    where: { tenantId, userId: req.user!.id },
    select: {
      id: true,
      name: true,
      relation: true,
      phone: true,
      email: true,
      occupation: true,
      isEmergency: true,
    },
    orderBy: { isEmergency: "desc" },
  });

  const primary = guardians[0] ?? null;

  return ok(res, {
    ...user,
    guardianId: primary?.id ?? null,
    displayName: primary?.name ?? user.name,
    relationship: primary?.relation ?? null,
    occupation: primary?.occupation ?? null,
    isEmergency: primary?.isEmergency ?? false,
    guardianships: guardians,
  });
});

const ParentProfileSchema = z.object({
  email: z.string().email().optional(),
  phone: z
    .string()
    .regex(/^\+?\d{10,15}$/)
    .optional(),
  occupation: z.string().max(100).optional(),
});

parentPortalRouter.patch("/profile", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const parsed = ParentProfileSchema.safeParse(req.body);
  if (!parsed.success) throw Errors.validationFailed(parsed.error.flatten());
  const body = parsed.data;

  await withTenantTransaction(prisma, tenantId, async (tx) => {
    if (body.email !== undefined || body.phone !== undefined) {
      await tx.user.update({
        where: { id: req.user!.id },
        data: {
          ...(body.email !== undefined ? { email: body.email } : {}),
          ...(body.phone !== undefined ? { phone: body.phone } : {}),
        },
      });
    }
    const guardianPatch: Record<string, string> = {};
    if (body.occupation !== undefined) guardianPatch.occupation = body.occupation;
    if (body.email !== undefined) guardianPatch.email = body.email;
    if (body.phone !== undefined) guardianPatch.phone = body.phone;
    if (Object.keys(guardianPatch).length > 0) {
      await tx.guardian.updateMany({
        where: { tenantId, userId: req.user!.id },
        data: guardianPatch,
      });
    }
  });

  return ok(res, { success: true });
});
