import { Router } from "express";
import { prisma } from "@/config/db";
import { Errors } from "@/lib/errors";
import { ok } from "@/lib/response";
import { authenticate, requireRole } from "@/middleware/auth";
import {
  MLServiceError,
  bootstrapModels,
  checkMLHealth,
  checkModelsStatus,
  predictDropout,
  predictDropoutBatch,
  predictPerformance,
} from "@/services/ml-client.service";

export const dropoutRouter = Router();

dropoutRouter.use(authenticate, requireRole("ADMIN", "TEACHER"));

dropoutRouter.get("/health", async (_req, res) => {
  const healthy = await checkMLHealth();
  const models = await checkModelsStatus();
  return ok(res, { healthy, models });
});

dropoutRouter.post("/bootstrap", requireRole("ADMIN"), async (_req, res) => {
  const result = await bootstrapModels();
  return ok(res, result);
});

dropoutRouter.get("/student/:studentId", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const student = await prisma.student.findFirst({
    where: { id: req.params.studentId, tenantId, deletedAt: null },
  });
  if (!student) throw Errors.notFound("Student");

  try {
    const prediction = await predictDropout(tenantId, req.params.studentId as string);
    return ok(res, prediction);
  } catch (err) {
    if (err instanceof MLServiceError) {
      return res.status(503).json({
        ok: false,
        error: {
          code: err.code,
          message: err.message,
          fallback: "Using engagement snapshot heuristics instead.",
        },
      });
    }
    throw err;
  }
});

dropoutRouter.get("/all", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const students = await prisma.student.findMany({
    where: { tenantId, deletedAt: null },
    include: {
      user: { select: { name: true } },
      batch: { select: { id: true, name: true } },
    },
  });

  if (students.length === 0) return ok(res, []);

  try {
    const predictions = await predictDropoutBatch(
      tenantId,
      students.map((s) => s.id),
    );
    const combined = predictions.map((p, i) => ({
      studentId: students[i]!.id,
      studentName: students[i]!.user.name,
      batchId: students[i]!.batch?.id ?? null,
      batchName: students[i]!.batch?.name ?? null,
      ...p,
    }));
    combined.sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0));
    return ok(res, combined);
  } catch (err) {
    if (err instanceof MLServiceError) {
      return res.status(503).json({
        ok: false,
        error: { code: err.code, message: err.message },
      });
    }
    throw err;
  }
});

/**
 * GET /api/v1/dropout/performance/student/:studentId
 * Predict for every subject the student has exam history in.
 * MUST be registered before /performance/:studentId/:subjectId so Express
 * doesn't match the literal "student" segment as a studentId.
 */
dropoutRouter.get(
  "/performance/student/:studentId",
  async (req, res) => {
    const tenantId = req.user!.tenantId;
    const { studentId } = req.params;

    const student = await prisma.student.findFirst({
      where: { id: studentId, tenantId, deletedAt: null },
    });
    if (!student) throw Errors.notFound("Student");

    const subjects = await prisma.markEntry.findMany({
      where: {
        studentId,
        isAbsent: false,
        exam: { subjectId: { not: null }, status: "PUBLISHED" },
      },
      select: {
        exam: { select: { subject: { select: { id: true, name: true } } } },
      },
      distinct: ["examId"],
    });

    const uniqueSubjects = new Map<string, string>();
    for (const row of subjects) {
      const s = row.exam.subject;
      if (s) uniqueSubjects.set(s.id, s.name);
    }

    if (uniqueSubjects.size === 0) return ok(res, []);

    try {
      const results: Array<{
        subjectId: string;
        subjectName: string;
      } & Awaited<ReturnType<typeof predictPerformance>>> = [];
      for (const [id, name] of uniqueSubjects) {
        const prediction = await predictPerformance(
          tenantId,
          studentId as string,
          id,
        );
        results.push({ subjectId: id, subjectName: name, ...prediction });
      }
      return ok(res, results);
    } catch (err) {
      if (err instanceof MLServiceError) {
        return res.status(503).json({
          ok: false,
          error: { code: err.code, message: err.message },
        });
      }
      throw err;
    }
  },
);

dropoutRouter.get(
  "/performance/:studentId/:subjectId",
  async (req, res) => {
    const tenantId = req.user!.tenantId;
    const { studentId, subjectId } = req.params;

    const student = await prisma.student.findFirst({
      where: { id: studentId, tenantId, deletedAt: null },
    });
    if (!student) throw Errors.notFound("Student");

    try {
      const prediction = await predictPerformance(
        tenantId,
        studentId as string,
        subjectId as string,
      );
      return ok(res, prediction);
    } catch (err) {
      if (err instanceof MLServiceError) {
        return res.status(503).json({
          ok: false,
          error: { code: err.code, message: err.message },
        });
      }
      throw err;
    }
  },
);
