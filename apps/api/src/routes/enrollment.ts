import { Router } from "express";
import { EnrollmentFormSchema } from "@raquel/types";
import { prisma, withTenantTransaction } from "@/config/db";
import { emitToTenant } from "@/config/socket";
import { Errors } from "@/lib/errors";
import { ok, created } from "@/lib/response";
import { validate } from "@/middleware/validate";

export const enrollmentRouter = Router();

function validateInvite(invite: { isActive: boolean; expiresAt: Date | null; maxUses: number; usedCount: number }) {
  if (!invite.isActive) throw Errors.badRequest("This invitation link has been deactivated");
  if (invite.expiresAt && invite.expiresAt < new Date()) throw Errors.badRequest("This invitation link has expired");
  if (invite.maxUses > 0 && invite.usedCount >= invite.maxUses) throw Errors.badRequest("This invitation link has reached its usage limit");
}

enrollmentRouter.get("/:code", async (req, res) => {
  const code = req.params.code as string;
  const invite = await prisma.inviteLink.findUnique({
    where: { code },
    include: {
      tenant: { select: { name: true, logoUrl: true } },
      batch: { select: { name: true } },
      class: { select: { name: true } },
    },
  });

  if (!invite) {
    return ok(res, { isValid: false, message: "This invitation link is not valid" });
  }

  const isExpired = invite.expiresAt && invite.expiresAt < new Date();
  const isOverLimit = invite.maxUses > 0 && invite.usedCount >= invite.maxUses;

  return ok(res, {
    isValid: invite.isActive && !isExpired && !isOverLimit,
    tenantName: invite.tenant.name,
    tenantLogo: invite.tenant.logoUrl,
    batchName: invite.batch?.name ?? null,
    className: invite.class?.name ?? null,
    batchId: invite.batchId,
    classId: invite.classId,
  });
});

enrollmentRouter.post("/:code", validate(EnrollmentFormSchema), async (req, res) => {
  const code = req.params.code as string;
  const invite = await prisma.inviteLink.findUnique({ where: { code } });
  if (!invite) throw Errors.notFound("Invite link");
  validateInvite(invite);

  const existingUser = await prisma.user.findFirst({
    where: { tenantId: invite.tenantId, phone: req.body.studentPhone, deletedAt: null },
  });
  if (existingUser) throw Errors.badRequest("This phone number is already registered at this institute");

  const existingRequest = await prisma.joinRequest.findFirst({
    where: { tenantId: invite.tenantId, studentPhone: req.body.studentPhone, status: "PENDING" },
  });
  if (existingRequest) throw Errors.badRequest("A pending application already exists for this phone number");

  const joinRequest = await withTenantTransaction(prisma, invite.tenantId, (tx) =>
    tx.joinRequest.create({
      data: {
        tenantId: invite.tenantId,
        inviteLinkId: invite.id,
        studentName: req.body.studentName,
        studentPhone: req.body.studentPhone,
        studentEmail: req.body.studentEmail || null,
        dateOfBirth: req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : null,
        gender: req.body.gender || null,
        address: req.body.address || null,
        city: req.body.city || null,
        state: req.body.state || null,
        pincode: req.body.pincode || null,
        previousSchool: req.body.previousSchool || null,
        bloodGroup: req.body.bloodGroup || null,
        classId: invite.classId,
        batchId: invite.batchId,
        guardians: req.body.guardians,
      },
    }),
  );

  emitToTenant(invite.tenantId, "joinRequest:new", {
    id: joinRequest.id,
    studentName: joinRequest.studentName,
  });
  emitToTenant(invite.tenantId, "stats:updated", {});

  return created(res, { id: joinRequest.id, message: "Application submitted successfully" });
});
