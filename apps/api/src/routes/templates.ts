import { prisma, withTenantTransaction } from "@/config/db";
import { Errors } from "@/lib/errors";
import { ok } from "@/lib/response";
import {
  SAMPLE_CONTEXT,
  listVariables,
  resolveTemplate,
} from "@/lib/template-engine";
import { authenticate, requireRole } from "@/middleware/auth";
import { validate } from "@/middleware/validate";
import type { Prisma } from "@prisma/client";
import { CreateTemplateSchema, UpdateTemplateSchema } from "@canop/types";
import { Router } from "express";

export const templatesRouter = Router();

templatesRouter.use(authenticate, requireRole("ADMIN"));

templatesRouter.get("/variables", (_req, res) => {
  return ok(res, { variables: listVariables(), sample: SAMPLE_CONTEXT });
});

templatesRouter.get("/", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { eventType, channel } = req.query as Record<string, string | undefined>;
  const where: Prisma.NotificationTemplateWhereInput = { tenantId };
  if (eventType) where.eventType = eventType;
  if (channel) where.channel = channel as Prisma.NotificationTemplateWhereInput["channel"];
  const rows = await prisma.notificationTemplate.findMany({
    where,
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
  return ok(res, rows);
});

templatesRouter.post("/", validate(CreateTemplateSchema), async (req, res) => {
  const tenantId = req.user!.tenantId;
  const body = req.body as import("@canop/types").CreateTemplate;
  const row = await withTenantTransaction(prisma, tenantId, (tx) =>
    tx.notificationTemplate.create({
      data: {
        tenantId,
        name: body.name,
        slug: body.slug,
        eventType: body.eventType,
        channel: body.channel,
        subject: body.subject ?? null,
        body: body.body,
        isDefault: false,
      },
    }),
  );
  return ok(res, row, 201);
});

templatesRouter.get("/:id", async (req, res) => {
  const row = await prisma.notificationTemplate.findFirst({
    where: { id: req.params.id as string, tenantId: req.user!.tenantId },
  });
  if (!row) throw Errors.notFound("Template");
  return ok(res, row);
});

templatesRouter.patch("/:id", validate(UpdateTemplateSchema), async (req, res) => {
  const tenantId = req.user!.tenantId;
  const id = req.params.id as string;
  const existing = await prisma.notificationTemplate.findFirst({ where: { id, tenantId } });
  if (!existing) throw Errors.notFound("Template");
  const body = req.body as import("@canop/types").UpdateTemplate;
  const data: Prisma.NotificationTemplateUpdateInput = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.subject !== undefined) data.subject = body.subject;
  if (body.body !== undefined) data.body = body.body;
  if (body.isActive !== undefined) data.isActive = body.isActive;

  const updated = await withTenantTransaction(prisma, tenantId, (tx) =>
    tx.notificationTemplate.update({ where: { id }, data }),
  );
  return ok(res, updated);
});

templatesRouter.delete("/:id", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const id = req.params.id as string;
  const existing = await prisma.notificationTemplate.findFirst({ where: { id, tenantId } });
  if (!existing) throw Errors.notFound("Template");
  if (existing.isDefault) {
    throw Errors.badRequest("Default templates cannot be deleted", "TEMPLATE_DEFAULT");
  }
  await withTenantTransaction(prisma, tenantId, (tx) =>
    tx.notificationTemplate.delete({ where: { id } }),
  );
  return ok(res, { deleted: true });
});

templatesRouter.post("/:id/preview", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const id = req.params.id as string;
  const tpl = await prisma.notificationTemplate.findFirst({ where: { id, tenantId } });
  if (!tpl) throw Errors.notFound("Template");
  const overrideBody = typeof req.body?.body === "string" ? (req.body.body as string) : tpl.body;
  const rendered = resolveTemplate(overrideBody, SAMPLE_CONTEXT);
  return ok(res, { rendered, channel: tpl.channel, subject: tpl.subject });
});
