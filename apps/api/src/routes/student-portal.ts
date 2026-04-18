import { Router } from "express";
import { format } from "date-fns";
import { z } from "zod";
import { prisma, withTenantTransaction } from "@/config/db";
import { Errors } from "@/lib/errors";
import { ok } from "@/lib/response";
import { buildAttendanceCalendar, buildStudentDashboard } from "@/lib/dashboard-builder";
import { authenticate, requireRole } from "@/middleware/auth";

export const studentPortalRouter = Router();

studentPortalRouter.use(authenticate, requireRole("STUDENT"));

studentPortalRouter.get("/dashboard", async (req, res) => {
  const tenantId = req.user!.tenantId;

  const dashboard = await withTenantTransaction(prisma, tenantId, async (tx) => {
    const student = await tx.student.findFirst({
      where: { userId: req.user!.id, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!student) throw Errors.notFound("Student profile");
    return buildStudentDashboard(tx, tenantId, student.id, req.user!.id);
  });

  if (!dashboard) throw Errors.notFound("Student");
  return ok(res, dashboard);
});

studentPortalRouter.get("/attendance-calendar", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const month = (req.query.month as string) || format(new Date(), "yyyy-MM");

  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw Errors.badRequest("month must be YYYY-MM");
  }

  const calendar = await withTenantTransaction(prisma, tenantId, async (tx) => {
    const student = await tx.student.findFirst({
      where: { userId: req.user!.id, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!student) throw Errors.notFound("Student profile");
    return buildAttendanceCalendar(tx, tenantId, student.id, month);
  });

  return ok(res, calendar);
});

studentPortalRouter.get("/profile", async (req, res) => {
  const tenantId = req.user!.tenantId;

  const student = await prisma.student.findFirst({
    where: { userId: req.user!.id, tenantId, deletedAt: null },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatarUrl: true,
        },
      },
      batch: {
        select: { id: true, name: true, class: { select: { name: true } } },
      },
    },
  });
  if (!student) throw Errors.notFound("Student profile");

  return ok(res, {
    id: student.id,
    userId: student.userId,
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

const ProfileUpdateSchema = z.object({
  email: z.string().email().optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  pincode: z
    .string()
    .regex(/^\d{4,10}$/, "pincode must be digits")
    .optional(),
});

studentPortalRouter.patch("/profile", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const parsed = ProfileUpdateSchema.safeParse(req.body);
  if (!parsed.success) throw Errors.validationFailed(parsed.error.flatten());
  const body = parsed.data;

  await withTenantTransaction(prisma, tenantId, async (tx) => {
    const student = await tx.student.findFirst({
      where: { userId: req.user!.id, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!student) throw Errors.notFound("Student profile");

    if (body.email) {
      await tx.user.update({
        where: { id: req.user!.id },
        data: { email: body.email },
      });
    }

    const studentPatch: Record<string, string> = {};
    if (body.address !== undefined) studentPatch.address = body.address;
    if (body.city !== undefined) studentPatch.city = body.city;
    if (body.state !== undefined) studentPatch.state = body.state;
    if (body.pincode !== undefined) studentPatch.pincode = body.pincode;
    if (Object.keys(studentPatch).length > 0) {
      await tx.student.update({ where: { id: student.id }, data: studentPatch });
    }
  });

  return ok(res, { success: true });
});
