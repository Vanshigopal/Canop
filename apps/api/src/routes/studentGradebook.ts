import { prisma } from "@/config/db";
import { Errors } from "@/lib/errors";
import { studentGradebook } from "@/lib/gradebook";
import { ok } from "@/lib/response";
import { authenticate, requireRole } from "@/middleware/auth";
import { Router } from "express";

export const studentGradebookRouter = Router();

studentGradebookRouter.use(authenticate, requireRole("STUDENT"));

studentGradebookRouter.get("/gradebook", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const student = await prisma.student.findFirst({
    where: { userId: req.user!.id, tenantId, deletedAt: null },
  });
  if (!student) throw Errors.notFound("Student profile");
  const gb = await studentGradebook(prisma, { tenantId, studentId: student.id });
  if (!gb) throw Errors.notFound("Gradebook");
  return ok(res, gb);
});
