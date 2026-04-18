import { randomBytes } from "node:crypto";
import { hashSync } from "bcryptjs";
import { Router } from "express";
import { CreateTeacherSchema, UpdateTeacherSchema } from "@raquel/types";
import { prisma, withTenantTransaction } from "@/config/db";
import { Errors } from "@/lib/errors";
import { ok, created } from "@/lib/response";
import { trackRecentItem } from "@/lib/search/recency";
import { authenticate, requireRole } from "@/middleware/auth";
import { validate } from "@/middleware/validate";
import { notifySafe } from "@/services/notification.service";

export const teachersRouter = Router();

teachersRouter.use(authenticate, requireRole("ADMIN"));

teachersRouter.get("/", async (req, res) => {
  const teachers = await prisma.user.findMany({
    where: { tenantId: req.user!.tenantId, role: "TEACHER", deletedAt: null },
    include: {
      permissions: true,
      teacherSubjects: { include: { subject: { select: { id: true, name: true, code: true } } } },
    },
    orderBy: { name: "asc" },
  });
  return ok(res, teachers);
});

teachersRouter.post("/", validate(CreateTeacherSchema), async (req, res) => {
  const { name, email, phone, subjectIds, permissions } = req.body;
  const tenantId = req.user!.tenantId;

  const existing = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId, email } },
  });
  if (existing) throw Errors.badRequest("A user with this email already exists");

  const password = randomBytes(8).toString("base64url");
  const passwordHash = hashSync(password, 12);

  const teacher = await withTenantTransaction(prisma, tenantId, async (tx) => {
    const user = await tx.user.create({
      data: { tenantId, email, passwordHash, name, role: "TEACHER", phone },
    });
    await tx.permission.create({
      data: { tenantId, userId: user.id, ...permissions },
    });
    if (subjectIds.length > 0) {
      await tx.teacherSubject.createMany({
        data: subjectIds.map((sid: string) => ({ tenantId, teacherId: user.id, subjectId: sid })),
      });
    }
    return tx.user.findUnique({
      where: { id: user.id },
      include: {
        permissions: true,
        teacherSubjects: { include: { subject: { select: { id: true, name: true, code: true } } } },
      },
    });
  });

  console.log(`[teacher-created] ${email} / ${password}`);

  if (teacher) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });
    void notifySafe({
      tenantId,
      eventType: "teacher_welcome",
      recipientUserId: teacher.id,
      context: {
        tutor_name: teacher.name,
        institute_name: tenant?.name ?? "",
      },
      channels: ["EMAIL"],
    });
  }

  return created(res, teacher);
});

teachersRouter.get("/:id", async (req, res) => {
  const id = req.params.id as string;
  const teacher = await prisma.user.findFirst({
    where: { id, tenantId: req.user!.tenantId, role: "TEACHER", deletedAt: null },
    include: {
      permissions: true,
      teacherSubjects: { include: { subject: { select: { id: true, name: true, code: true } } } },
    },
  });
  if (!teacher) throw Errors.notFound("Teacher");
  void trackRecentItem(req.user!.tenantId, req.user!.id, "teacher", id).catch(() => {});
  return ok(res, teacher);
});

teachersRouter.patch("/:id", validate(UpdateTeacherSchema), async (req, res) => {
  const id = req.params.id as string;
  const { name, phone, subjectIds, permissions } = req.body;
  const tenantId = req.user!.tenantId;

  const teacher = await prisma.user.findFirst({
    where: { id, tenantId, role: "TEACHER", deletedAt: null },
  });
  if (!teacher) throw Errors.notFound("Teacher");

  const updated = await withTenantTransaction(prisma, tenantId, async (tx) => {
    if (name || phone) {
      await tx.user.update({ where: { id: teacher.id }, data: { ...(name && { name }), ...(phone && { phone }) } });
    }
    if (permissions) {
      await tx.permission.upsert({
        where: { tenantId_userId: { tenantId, userId: teacher.id } },
        create: { tenantId, userId: teacher.id, ...permissions },
        update: permissions,
      });
    }
    if (subjectIds) {
      await tx.teacherSubject.deleteMany({ where: { teacherId: teacher.id } });
      if (subjectIds.length > 0) {
        await tx.teacherSubject.createMany({
          data: subjectIds.map((sid: string) => ({ tenantId, teacherId: teacher.id, subjectId: sid })),
        });
      }
    }
    return tx.user.findUnique({
      where: { id: teacher.id },
      include: {
        permissions: true,
        teacherSubjects: { include: { subject: { select: { id: true, name: true, code: true } } } },
      },
    });
  });

  return ok(res, updated);
});

teachersRouter.delete("/:id", async (req, res) => {
  const id = req.params.id as string;
  const teacher = await prisma.user.findFirst({
    where: { id, tenantId: req.user!.tenantId, role: "TEACHER", deletedAt: null },
  });
  if (!teacher) throw Errors.notFound("Teacher");
  await withTenantTransaction(prisma, req.user!.tenantId, (tx) =>
    tx.user.update({ where: { id: teacher.id }, data: { deletedAt: new Date(), isActive: false } }),
  );
  return ok(res, { deleted: true });
});
