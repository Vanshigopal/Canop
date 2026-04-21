import { Router } from "express";
import { z } from "zod";
import { prisma } from "@/config/db";
import { Errors } from "@/lib/errors";
import { ok, created } from "@/lib/response";
import { authenticate, requireRole } from "@/middleware/auth";
import { validate } from "@/middleware/validate";

export const answerKeysRouter = Router();
answerKeysRouter.use(authenticate, requireRole("ADMIN", "TEACHER"));

const AnswerKeyBodySchema = z.object({
  examId: z.string().uuid(),
  answers: z.record(z.string(), z.number().int().min(1).max(4)),
});

answerKeysRouter.get("/", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const rows = await prisma.answerKey.findMany({
    where: { tenantId },
    include: {
      exam: {
        select: {
          id: true,
          name: true,
          totalQuestions: true,
          batch: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return ok(res, rows);
});

answerKeysRouter.get("/:examId", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const examId = req.params.examId as string;
  const row = await prisma.answerKey.findFirst({
    where: { tenantId, examId },
    include: {
      exam: {
        select: {
          id: true,
          name: true,
          totalQuestions: true,
          batch: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!row) throw Errors.notFound("Answer key");
  return ok(res, row);
});

answerKeysRouter.post("/", validate(AnswerKeyBodySchema), async (req, res) => {
  const tenantId = req.user!.tenantId;
  const body = req.body as z.infer<typeof AnswerKeyBodySchema>;
  const exam = await prisma.exam.findFirst({
    where: { id: body.examId, tenantId, deletedAt: null },
  });
  if (!exam) throw Errors.notFound("Exam");
  const existing = await prisma.answerKey.findFirst({
    where: { tenantId, examId: body.examId },
  });
  if (existing) {
    const updated = await prisma.answerKey.update({
      where: { id: existing.id },
      data: { answers: body.answers, updatedAt: new Date() },
    });
    return ok(res, updated);
  }
  const row = await prisma.answerKey.create({
    data: {
      tenantId,
      examId: body.examId,
      answers: body.answers,
      createdById: req.user!.id,
    },
  });
  return created(res, row);
});

answerKeysRouter.put("/:examId", validate(AnswerKeyBodySchema.pick({ answers: true })), async (req, res) => {
  const tenantId = req.user!.tenantId;
  const examId = req.params.examId as string;
  const body = req.body as { answers: Record<string, number> };
  const existing = await prisma.answerKey.findFirst({
    where: { tenantId, examId },
  });
  if (!existing) throw Errors.notFound("Answer key");
  const updated = await prisma.answerKey.update({
    where: { id: existing.id },
    data: { answers: body.answers, updatedAt: new Date() },
  });
  return ok(res, updated);
});

answerKeysRouter.delete("/:examId", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const examId = req.params.examId as string;
  const existing = await prisma.answerKey.findFirst({
    where: { tenantId, examId },
  });
  if (!existing) throw Errors.notFound("Answer key");
  await prisma.answerKey.delete({ where: { id: existing.id } });
  return ok(res, { deleted: true });
});
