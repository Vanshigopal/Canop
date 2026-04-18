import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma, withTenantTransaction } from "@/config/db";
import { emitToTenant } from "@/config/socket";
import { Errors } from "@/lib/errors";
import { ok } from "@/lib/response";
import { authenticate, requirePermission, requireRole } from "@/middleware/auth";
import { notifySafe } from "@/services/notification.service";
import { getSignedDownloadUrl, uploadFile } from "@/services/storage.service";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

export const assignmentsRouter = Router();
assignmentsRouter.use(authenticate);

// GET /api/v1/assignments
assignmentsRouter.get("/", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { batchId, subjectId, status } = req.query;

  const rows = await withTenantTransaction(prisma, tenantId, async (tx) => {
    // biome-ignore lint/suspicious/noExplicitAny: Prisma where
    const where: any = { deletedAt: null };
    if (batchId) where.batchId = batchId as string;
    if (subjectId) where.subjectId = subjectId as string;
    if (status) where.status = status as string;

    if (req.user!.role === "STUDENT") {
      const student = await tx.student.findFirst({
        where: { userId: req.user!.id, deletedAt: null },
        select: { id: true, batchId: true },
      });
      if (!student || !student.batchId) return [];
      where.batchId = student.batchId;
      where.status = { in: ["PUBLISHED", "CLOSED"] };

      const assignments = await tx.assignment.findMany({
        where,
        include: {
          subject: { select: { id: true, name: true } },
          _count: { select: { attachments: true } },
        },
        orderBy: { deadline: "asc" },
      });

      const submissions = await tx.assignmentSubmission.findMany({
        where: {
          studentId: student.id,
          assignmentId: { in: assignments.map((a) => a.id) },
        },
        select: {
          assignmentId: true,
          status: true,
          submittedAt: true,
          marksAwarded: true,
          isLate: true,
        },
      });
      const subsByAssignment = new Map(submissions.map((s) => [s.assignmentId, s]));
      return assignments.map((a) => ({
        ...a,
        mySubmission: subsByAssignment.get(a.id) ?? null,
      }));
    }

    return tx.assignment.findMany({
      where,
      include: {
        subject: { select: { id: true, name: true } },
        batch: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { submissions: true, attachments: true } },
      },
      orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
    });
  });

  return ok(res, rows);
});

// GET /api/v1/assignments/:id
assignmentsRouter.get("/:id", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const result = await withTenantTransaction(prisma, tenantId, async (tx) => {
    const assignment = await tx.assignment.findFirst({
      where: { id: req.params.id as string, deletedAt: null },
      include: {
        subject: { select: { id: true, name: true } },
        batch: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        attachments: true,
      },
    });
    if (!assignment) return null;

    if (req.user!.role === "STUDENT") {
      const student = await tx.student.findFirst({
        where: { userId: req.user!.id, deletedAt: null },
        select: { id: true, batchId: true },
      });
      if (!student || student.batchId !== assignment.batchId) return null;

      const submission = await tx.assignmentSubmission.findUnique({
        where: {
          assignmentId_studentId: { assignmentId: assignment.id, studentId: student.id },
        },
        include: { files: true },
      });
      return { ...assignment, mySubmission: submission };
    }

    const submissions = await tx.assignmentSubmission.findMany({
      where: { assignmentId: assignment.id },
      include: {
        student: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        files: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return { ...assignment, submissions };
  });

  if (!result) throw Errors.notFound("Assignment");
  return ok(res, result);
});

// POST /api/v1/assignments
assignmentsRouter.post(
  "/",
  requireRole("ADMIN", "TEACHER"),
  requirePermission("canManageContent"),
  async (req, res) => {
    const schema = z.object({
      title: z.string().min(1).max(200),
      description: z.string().min(1),
      instructions: z.string().optional(),
      batchId: z.string().uuid(),
      subjectId: z.string().uuid().optional(),
      deadline: z.string().datetime(),
      allowLateSubmission: z.boolean().default(true),
      lateDeadline: z.string().datetime().optional(),
      totalMarks: z.coerce.number().min(1).max(9999),
      latePenaltyPercent: z.coerce.number().min(0).max(100).optional(),
    });
    const body = schema.parse(req.body);
    const tenantId = req.user!.tenantId;

    const assignment = await withTenantTransaction(prisma, tenantId, async (tx) => {
      return tx.assignment.create({
        data: {
          tenantId,
          title: body.title,
          description: body.description,
          instructions: body.instructions,
          batchId: body.batchId,
          subjectId: body.subjectId,
          deadline: new Date(body.deadline),
          allowLateSubmission: body.allowLateSubmission,
          lateDeadline: body.lateDeadline ? new Date(body.lateDeadline) : null,
          totalMarks: body.totalMarks,
          latePenaltyPercent: body.latePenaltyPercent,
          status: "DRAFT",
          createdById: req.user!.id,
        },
      });
    });

    emitToTenant(tenantId, "assignment:created", {
      assignmentId: assignment.id,
      title: assignment.title,
    });
    return ok(res, assignment);
  },
);

// POST /api/v1/assignments/:id/publish
assignmentsRouter.post(
  "/:id/publish",
  requireRole("ADMIN", "TEACHER"),
  requirePermission("canManageContent"),
  async (req, res) => {
    const tenantId = req.user!.tenantId;

    const result = await withTenantTransaction(prisma, tenantId, async (tx) => {
      const existing = await tx.assignment.findFirst({
        where: { id: req.params.id as string, deletedAt: null },
      });
      if (!existing) throw Errors.notFound("Assignment");
      if (existing.status !== "DRAFT") {
        throw Errors.validationFailed({ status: "Only draft assignments can be published" });
      }

      const updated = await tx.assignment.update({
        where: { id: existing.id },
        data: { status: "PUBLISHED", publishedAt: new Date() },
      });

      const students = await tx.student.findMany({
        where: { batchId: existing.batchId, deletedAt: null },
        include: { user: { select: { id: true, name: true } }, guardians: true },
      });

      return { assignment: updated, students };
    });

    const assignment = result.assignment;
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    for (const student of result.students) {
      const deadlineStr = assignment.deadline.toISOString().slice(0, 16).replace("T", " ");
      await notifySafe({
        tenantId,
        eventType: "assignment_published",
        recipientUserId: student.userId,
        context: {
          student_name: student.user.name,
          assignment_name: assignment.title,
          deadline: deadlineStr,
          total_marks: String(assignment.totalMarks),
          institute_name: tenant?.name ?? "Raquel",
        },
      });
    }

    emitToTenant(tenantId, "assignment:published", { assignmentId: assignment.id });
    return ok(res, assignment);
  },
);

// POST /api/v1/assignments/:id/close
assignmentsRouter.post(
  "/:id/close",
  requireRole("ADMIN", "TEACHER"),
  requirePermission("canManageContent"),
  async (req, res) => {
    const tenantId = req.user!.tenantId;
    const assignment = await withTenantTransaction(prisma, tenantId, async (tx) => {
      const existing = await tx.assignment.findFirst({
        where: { id: req.params.id as string, deletedAt: null },
      });
      if (!existing) throw Errors.notFound("Assignment");
      return tx.assignment.update({
        where: { id: existing.id },
        data: { status: "CLOSED" },
      });
    });
    emitToTenant(tenantId, "assignment:closed", { assignmentId: assignment.id });
    return ok(res, assignment);
  },
);

// POST /api/v1/assignments/:id/attachments
assignmentsRouter.post(
  "/:id/attachments",
  requireRole("ADMIN", "TEACHER"),
  requirePermission("canManageContent"),
  upload.single("file"),
  async (req, res) => {
    const file = req.file;
    if (!file) throw Errors.validationFailed({ file: "Required" });

    const tenantId = req.user!.tenantId;
    const attachment = await withTenantTransaction(prisma, tenantId, async (tx) => {
      const assignment = await tx.assignment.findFirst({
        where: { id: req.params.id as string, deletedAt: null },
      });
      if (!assignment) throw Errors.notFound("Assignment");

      const uploadResult = await uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        tenantId,
      );
      return tx.assignmentAttachment.create({
        data: {
          tenantId,
          assignmentId: assignment.id,
          fileKey: uploadResult.fileKey,
          fileName: file.originalname,
          fileSize: uploadResult.fileSize,
          mimeType: file.mimetype,
        },
      });
    });

    emitToTenant(tenantId, "assignment:attachment:added", {
      assignmentId: req.params.id as string,
      attachmentId: attachment.id,
    });
    return ok(res, attachment);
  },
);

// GET /api/v1/assignments/attachments/:id/download
assignmentsRouter.get("/attachments/:id/download", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const attachment = await withTenantTransaction(prisma, tenantId, async (tx) => {
    const a = await tx.assignmentAttachment.findFirst({
      where: { id: req.params.id as string },
      include: { assignment: true },
    });
    if (!a) return null;

    if (req.user!.role === "STUDENT") {
      const student = await tx.student.findFirst({
        where: { userId: req.user!.id, deletedAt: null },
        select: { batchId: true },
      });
      if (!student || student.batchId !== a.assignment.batchId) return null;
    }

    return a;
  });

  if (!attachment) throw Errors.notFound("Attachment");
  const signedUrl = await getSignedDownloadUrl(attachment.fileKey, 600);
  return ok(res, { downloadUrl: signedUrl, fileName: attachment.fileName });
});

// POST /api/v1/assignments/:id/open
assignmentsRouter.post("/:id/open", async (req, res) => {
  if (req.user!.role !== "STUDENT") return ok(res, { skipped: true });
  const tenantId = req.user!.tenantId;

  await withTenantTransaction(prisma, tenantId, async (tx) => {
    const student = await tx.student.findFirst({
      where: { userId: req.user!.id, deletedAt: null },
      select: { id: true, batchId: true },
    });
    if (!student || !student.batchId) return;

    const assignment = await tx.assignment.findFirst({
      where: { id: req.params.id as string, deletedAt: null, batchId: student.batchId },
    });
    if (!assignment) return;

    await tx.assignmentSubmission.upsert({
      where: {
        assignmentId_studentId: { assignmentId: assignment.id, studentId: student.id },
      },
      update: {
        openedAt: new Date(),
        status: "OPENED",
      },
      create: {
        tenantId,
        assignmentId: assignment.id,
        studentId: student.id,
        openedAt: new Date(),
        status: "OPENED",
      },
    });
  });

  return ok(res, { success: true });
});

// POST /api/v1/assignments/:id/submit
assignmentsRouter.post("/:id/submit", upload.array("files", 5), async (req, res) => {
  if (req.user!.role !== "STUDENT") throw Errors.forbidden("Only students can submit");
  const tenantId = req.user!.tenantId;

  const files = (req.files as Express.Multer.File[]) ?? [];
  if (files.length === 0) {
    throw Errors.validationFailed({ files: "At least one file required" });
  }

  const uploadedFiles = [] as Array<{
    tenantId: string;
    fileKey: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  }>;
  for (const file of files) {
    const uploadResult = await uploadFile(file.buffer, file.originalname, file.mimetype, tenantId);
    uploadedFiles.push({
      tenantId,
      fileKey: uploadResult.fileKey,
      fileName: file.originalname,
      fileSize: uploadResult.fileSize,
      mimeType: file.mimetype,
    });
  }

  const result = await withTenantTransaction(prisma, tenantId, async (tx) => {
    const assignment = await tx.assignment.findFirst({
      where: { id: req.params.id as string, deletedAt: null },
    });
    if (!assignment) throw Errors.notFound("Assignment");

    if (assignment.status !== "PUBLISHED") {
      throw Errors.validationFailed({ status: "Assignment not accepting submissions" });
    }

    const now = new Date();
    const isPastDeadline = now > assignment.deadline;
    const isPastLateDeadline = assignment.lateDeadline && now > assignment.lateDeadline;

    if (isPastDeadline && !assignment.allowLateSubmission) {
      throw Errors.validationFailed({ deadline: "Submission deadline has passed" });
    }
    if (isPastLateDeadline) {
      throw Errors.validationFailed({ deadline: "Late submission deadline has passed" });
    }

    const student = await tx.student.findFirst({
      where: { userId: req.user!.id, deletedAt: null },
      select: { id: true, batchId: true },
    });
    if (!student) throw Errors.forbidden("Student record not found");
    if (student.batchId !== assignment.batchId) {
      throw Errors.forbidden("Assignment not in your batch");
    }

    const submission = await tx.assignmentSubmission.upsert({
      where: {
        assignmentId_studentId: { assignmentId: assignment.id, studentId: student.id },
      },
      update: {
        firstUploadAt: new Date(),
        submittedAt: new Date(),
        status: isPastDeadline ? "LATE_SUBMITTED" : "SUBMITTED",
        isLate: isPastDeadline,
      },
      create: {
        tenantId,
        assignmentId: assignment.id,
        studentId: student.id,
        openedAt: new Date(),
        firstUploadAt: new Date(),
        submittedAt: new Date(),
        status: isPastDeadline ? "LATE_SUBMITTED" : "SUBMITTED",
        isLate: isPastDeadline,
      },
    });

    await tx.submissionFile.deleteMany({ where: { submissionId: submission.id } });
    await tx.submissionFile.createMany({
      data: uploadedFiles.map((f) => ({ ...f, submissionId: submission.id })),
    });

    return submission;
  });

  emitToTenant(tenantId, "submission:received", {
    assignmentId: req.params.id as string,
    submissionId: result.id,
  });
  return ok(res, result);
});

// POST /api/v1/assignments/submissions/:id/grade
assignmentsRouter.post(
  "/submissions/:id/grade",
  requireRole("ADMIN", "TEACHER"),
  requirePermission("canManageContent"),
  async (req, res) => {
    const schema = z.object({
      marksAwarded: z.coerce.number().min(0),
      feedback: z.string().max(5000).optional(),
    });
    const body = schema.parse(req.body);
    const tenantId = req.user!.tenantId;

    const result = await withTenantTransaction(prisma, tenantId, async (tx) => {
      const submission = await tx.assignmentSubmission.findFirst({
        where: { id: req.params.id as string },
        include: {
          assignment: true,
          student: {
            include: { user: { select: { id: true, name: true } }, guardians: true },
          },
        },
      });
      if (!submission) throw Errors.notFound("Submission");

      if (body.marksAwarded > Number(submission.assignment.totalMarks)) {
        throw Errors.validationFailed({ marksAwarded: "Exceeds total marks" });
      }

      let finalMarks = body.marksAwarded;
      if (submission.isLate && submission.assignment.latePenaltyPercent) {
        const penalty = Number(submission.assignment.latePenaltyPercent) / 100;
        finalMarks = finalMarks * (1 - penalty);
      }
      finalMarks = Math.round(finalMarks * 100) / 100;

      const updated = await tx.assignmentSubmission.update({
        where: { id: submission.id },
        data: {
          marksAwarded: finalMarks,
          feedback: body.feedback,
          status: "GRADED",
          gradedById: req.user!.id,
          gradedAt: new Date(),
        },
      });

      return { updated, submission };
    });

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    const { updated, submission } = result;
    const marksValue = updated.marksAwarded != null ? String(updated.marksAwarded) : "0";

    // Notify student
    await notifySafe({
      tenantId,
      eventType: "assignment_graded",
      recipientUserId: submission.student.userId,
      context: {
        parent_name: submission.student.user.name,
        student_name: submission.student.user.name,
        assignment_name: submission.assignment.title,
        marks: marksValue,
        total_marks: String(submission.assignment.totalMarks),
        institute_name: tenant?.name ?? "Raquel",
      },
    });

    // Notify parents
    for (const guardian of submission.student.guardians) {
      if (!guardian.userId) continue;
      await notifySafe({
        tenantId,
        eventType: "assignment_graded",
        recipientUserId: guardian.userId,
        context: {
          parent_name: guardian.name,
          student_name: submission.student.user.name,
          assignment_name: submission.assignment.title,
          marks: marksValue,
          total_marks: String(submission.assignment.totalMarks),
          institute_name: tenant?.name ?? "Raquel",
        },
      });
    }

    emitToTenant(tenantId, "submission:graded", { submissionId: updated.id });
    return ok(res, updated);
  },
);

// GET /api/v1/assignments/submissions/:id/files/:fileId/download
assignmentsRouter.get("/submissions/:id/files/:fileId/download", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const file = await withTenantTransaction(prisma, tenantId, async (tx) => {
    const f = await tx.submissionFile.findFirst({
      where: { id: req.params.fileId as string, submissionId: req.params.id as string },
      include: {
        submission: { include: { student: true, assignment: true } },
      },
    });
    if (!f) return null;

    if (req.user!.role === "STUDENT") {
      const student = await tx.student.findFirst({
        where: { userId: req.user!.id, deletedAt: null },
        select: { id: true },
      });
      if (!student || student.id !== f.submission.studentId) return null;
    }
    return f;
  });
  if (!file) throw Errors.notFound("File");

  const signedUrl = await getSignedDownloadUrl(file.fileKey, 600);
  return ok(res, { downloadUrl: signedUrl, fileName: file.fileName });
});

// DELETE /api/v1/assignments/:id
assignmentsRouter.delete(
  "/:id",
  requireRole("ADMIN", "TEACHER"),
  requirePermission("canManageContent"),
  async (req, res) => {
    const tenantId = req.user!.tenantId;
    const assignment = await withTenantTransaction(prisma, tenantId, async (tx) => {
      const existing = await tx.assignment.findFirst({
        where: { id: req.params.id as string, deletedAt: null },
      });
      if (!existing) throw Errors.notFound("Assignment");
      return tx.assignment.update({
        where: { id: existing.id },
        data: { deletedAt: new Date(), status: "CLOSED" },
      });
    });
    emitToTenant(tenantId, "assignment:deleted", { assignmentId: assignment.id });
    return ok(res, { success: true });
  },
);
