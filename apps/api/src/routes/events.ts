import { Router } from "express";
import { z } from "zod";
import { prisma } from "@/config/db";
import { Errors } from "@/lib/errors";
import { ok, created } from "@/lib/response";
import { authenticate, requireRole } from "@/middleware/auth";
import { validate } from "@/middleware/validate";

export const eventsRouter = Router();
eventsRouter.use(authenticate);

const EventBodySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  date: z.string().datetime(),
  endDate: z.string().datetime().nullable().optional(),
  type: z.enum(["ACADEMIC", "EXTRACURRICULAR", "HOLIDAY", "EXAM"]).default("ACADEMIC"),
  audience: z.string().max(30).default("ALL"),
});

eventsRouter.get("/", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const events = await prisma.event.findMany({
    where: { tenantId },
    orderBy: { date: "asc" },
  });
  return ok(res, events);
});

eventsRouter.post(
  "/",
  requireRole("ADMIN", "TEACHER", "STAFF"),
  validate(EventBodySchema),
  async (req, res) => {
    const body = req.body as z.infer<typeof EventBodySchema>;
    const tenantId = req.user!.tenantId;
    const event = await prisma.event.create({
      data: {
        tenantId,
        title: body.title,
        description: body.description,
        date: new Date(body.date),
        endDate: body.endDate ? new Date(body.endDate) : null,
        type: body.type,
        audience: body.audience,
        createdById: req.user!.id,
      },
    });
    return created(res, event);
  },
);

eventsRouter.delete("/:id", requireRole("ADMIN", "TEACHER", "STAFF"), async (req, res) => {
  const id = req.params.id as string;
  const tenantId = req.user!.tenantId;
  const existing = await prisma.event.findFirst({ where: { id, tenantId } });
  if (!existing) throw Errors.notFound("Event");
  await prisma.event.delete({ where: { id } });
  return ok(res, { deleted: true });
});
