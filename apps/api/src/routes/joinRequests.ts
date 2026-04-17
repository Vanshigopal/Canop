import { Router } from "express";
import { prisma, withTenantTransaction } from "@/config/db";
import { emitToTenant } from "@/config/socket";
import { Errors } from "@/lib/errors";
import { ok, paginated } from "@/lib/response";
import { authenticate, requireRole } from "@/middleware/auth";

export const joinRequestsRouter = Router();

joinRequestsRouter.use(authenticate, requireRole("ADMIN", "TEACHER", "STAFF"));

joinRequestsRouter.get("/", async (req, res) => {
  const { status, page = "1", pageSize = "50" } = req.query as Record<string, string>;
  const p = Math.max(1, Number(page));
  const ps = Math.min(100, Math.max(1, Number(pageSize)));

  const where: Record<string, unknown> = { tenantId: req.user!.tenantId };
  if (status && ["PENDING", "APPROVED", "REJECTED"].includes(status)) {
    where.status = status;
  }

  const [data, total] = await Promise.all([
    prisma.joinRequest.findMany({
      where,
      include: {
        inviteLink: { select: { code: true } },
        reviewedBy: { select: { id: true, name: true } },
      },
      skip: (p - 1) * ps,
      take: ps,
      orderBy: { createdAt: "desc" },
    }),
    prisma.joinRequest.count({ where }),
  ]);
  return paginated(res, data, { total, page: p, pageSize: ps });
});

joinRequestsRouter.get("/:id", async (req, res) => {
  const id = req.params.id as string;
  const jr = await prisma.joinRequest.findFirst({
    where: { id, tenantId: req.user!.tenantId },
    include: {
      inviteLink: { select: { code: true, batch: { select: { name: true } }, class: { select: { name: true } } } },
      reviewedBy: { select: { id: true, name: true } },
    },
  });
  if (!jr) throw Errors.notFound("Join request");
  return ok(res, jr);
});

joinRequestsRouter.post("/:id/approve", async (req, res) => {
  const id = req.params.id as string;
  const tenantId = req.user!.tenantId;
  const jr = await prisma.joinRequest.findFirst({
    where: { id, tenantId },
  });
  if (!jr) throw Errors.notFound("Join request");
  if (jr.status !== "PENDING") throw Errors.badRequest("This request has already been processed");

  const result = await withTenantTransaction(prisma, tenantId, async (tx) => {
    const studentEmail = jr.studentEmail || `${jr.studentPhone.replace(/\+/g, "")}@student.raquel.app`;
    const studentUser = await tx.user.create({
      data: {
        tenantId,
        email: studentEmail,
        name: jr.studentName,
        role: "STUDENT",
        phone: jr.studentPhone,
      },
    });

    const student = await tx.student.create({
      data: {
        tenantId,
        userId: studentUser.id,
        batchId: jr.batchId,
        classId: jr.classId,
        dateOfBirth: jr.dateOfBirth,
        gender: jr.gender,
        address: jr.address,
        city: jr.city,
        state: jr.state,
        pincode: jr.pincode,
        previousSchool: jr.previousSchool,
        bloodGroup: jr.bloodGroup,
      },
    });

    const guardianData = jr.guardians as Array<{
      name: string;
      relation: "FATHER" | "MOTHER" | "GUARDIAN" | "OTHER";
      phone: string;
      email?: string;
      occupation?: string;
      isEmergency?: boolean;
    }>;

    for (const g of guardianData) {
      let parentUser = await tx.user.findFirst({
        where: { tenantId, phone: g.phone, role: "PARENT", deletedAt: null },
      });
      if (!parentUser) {
        const parentEmail = g.email || `${g.phone.replace(/\+/g, "")}@parent.raquel.app`;
        parentUser = await tx.user.create({
          data: { tenantId, email: parentEmail, name: g.name, role: "PARENT", phone: g.phone },
        });
      }
      await tx.guardian.create({
        data: {
          tenantId,
          studentId: student.id,
          userId: parentUser.id,
          name: g.name,
          relation: g.relation,
          phone: g.phone,
          email: g.email || null,
          occupation: g.occupation || null,
          isEmergency: g.isEmergency ?? false,
        },
      });
    }

    await tx.joinRequest.update({
      where: { id: jr.id },
      data: {
        status: "APPROVED",
        reviewedById: req.user!.id,
        reviewedAt: new Date(),
        studentId: student.id,
      },
    });

    if (jr.inviteLinkId) {
      await tx.inviteLink.update({
        where: { id: jr.inviteLinkId },
        data: { usedCount: { increment: 1 } },
      });
    }

    console.log(`[enrollment-approved] ${jr.studentName} → Student created, ${guardianData.length} guardians linked`);

    return tx.student.findUnique({
      where: { id: student.id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        batch: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
        guardians: true,
      },
    });
  });

  emitToTenant(tenantId, "joinRequest:updated", { id: jr.id, status: "APPROVED" });
  emitToTenant(tenantId, "stats:updated", {});
  return ok(res, result);
});

joinRequestsRouter.post("/:id/reject", async (req, res) => {
  const id = req.params.id as string;
  const jr = await prisma.joinRequest.findFirst({
    where: { id, tenantId: req.user!.tenantId },
  });
  if (!jr) throw Errors.notFound("Join request");
  if (jr.status !== "PENDING") throw Errors.badRequest("This request has already been processed");

  const tenantId = req.user!.tenantId;
  const updated = await withTenantTransaction(prisma, tenantId, (tx) =>
    tx.joinRequest.update({
      where: { id: jr.id },
      data: {
        status: "REJECTED",
        reviewedById: req.user!.id,
        reviewedAt: new Date(),
        rejectionNote: req.body.note || null,
      },
    }),
  );
  emitToTenant(tenantId, "joinRequest:updated", { id: jr.id, status: "REJECTED" });
  emitToTenant(tenantId, "stats:updated", {});
  return ok(res, updated);
});
