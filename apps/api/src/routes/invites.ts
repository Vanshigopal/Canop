import { randomBytes } from "node:crypto";
import { Router } from "express";
import { InviteCreateSchema } from "@raquel/types";
import { prisma, withTenantTransaction } from "@/config/db";
import { Errors } from "@/lib/errors";
import { ok, created } from "@/lib/response";
import { authenticate, requireRole } from "@/middleware/auth";
import { validate } from "@/middleware/validate";

export const invitesRouter = Router();

invitesRouter.use(authenticate, requireRole("ADMIN", "TEACHER", "STAFF"));

invitesRouter.get("/", async (req, res) => {
  const invites = await prisma.inviteLink.findMany({
    where: { tenantId: req.user!.tenantId },
    include: {
      batch: { select: { id: true, name: true } },
      class: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      _count: { select: { joinRequests: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return ok(res, invites);
});

invitesRouter.post("/", validate(InviteCreateSchema), async (req, res) => {
  const code = randomBytes(6).toString("base64url").slice(0, 8);
  const invite = await withTenantTransaction(prisma, req.user!.tenantId, (tx) =>
    tx.inviteLink.create({
      data: {
        tenantId: req.user!.tenantId,
        code,
        batchId: req.body.batchId || null,
        classId: req.body.classId || null,
        createdById: req.user!.id,
        maxUses: req.body.maxUses ?? 0,
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : null,
      },
      include: {
        batch: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
      },
    }),
  );
  return created(res, { ...invite, link: `${req.protocol}://${req.get("host")?.replace(/:\d+$/, "")}:5173/enroll/${code}` });
});

invitesRouter.get("/:id", async (req, res) => {
  const id = req.params.id as string;
  const invite = await prisma.inviteLink.findFirst({
    where: { id, tenantId: req.user!.tenantId },
    include: {
      batch: { select: { id: true, name: true } },
      class: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      _count: { select: { joinRequests: true } },
    },
  });
  if (!invite) throw Errors.notFound("Invite link");
  return ok(res, invite);
});

invitesRouter.patch("/:id", async (req, res) => {
  const id = req.params.id as string;
  const invite = await prisma.inviteLink.findFirst({
    where: { id, tenantId: req.user!.tenantId },
  });
  if (!invite) throw Errors.notFound("Invite link");
  const updated = await withTenantTransaction(prisma, req.user!.tenantId, (tx) =>
    tx.inviteLink.update({
      where: { id: invite.id },
      data: { isActive: req.body.isActive ?? invite.isActive },
    }),
  );
  return ok(res, updated);
});
