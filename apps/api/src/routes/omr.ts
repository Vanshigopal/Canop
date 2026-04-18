import { Router } from "express";
import multer from "multer";
import { prisma, withTenantTransaction } from "@/config/db";
import { emitToTenant } from "@/config/socket";
import { Errors } from "@/lib/errors";
import { ok } from "@/lib/response";
import { authenticate, requireRole } from "@/middleware/auth";
import { MLServiceError, scanOMR } from "@/services/ml-client.service";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const omrRouter = Router();

omrRouter.use(authenticate, requireRole("ADMIN", "TEACHER"));

/**
 * POST /api/v1/omr/scan
 * Multipart form-data: file (image), examId, studentId, answerKey (JSON string)
 */
omrRouter.post("/scan", upload.single("file"), async (req, res) => {
  const file = req.file;
  if (!file) throw Errors.validationFailed({ file: "Required" });

  const examId = String(req.body.examId ?? "");
  const studentId = String(req.body.studentId ?? "");
  const answerKeyRaw = req.body.answerKey;
  if (!examId) throw Errors.validationFailed({ examId: "Required" });
  if (!studentId) throw Errors.validationFailed({ studentId: "Required" });
  if (!answerKeyRaw) throw Errors.validationFailed({ answerKey: "Required" });

  const tenantId = req.user!.tenantId;

  const exam = await prisma.exam.findFirst({
    where: { id: examId, tenantId, deletedAt: null },
  });
  if (!exam) throw Errors.notFound("Exam");
  if (exam.type !== "MCQ" && exam.type !== "THEORY_MCQ") {
    throw Errors.badRequest(
      "OMR only valid for MCQ exams",
      "INVALID_EXAM_TYPE",
    );
  }
  if (!exam.totalQuestions || !exam.marksPerCorrect) {
    throw Errors.badRequest(
      "Exam missing MCQ config (totalQuestions / marksPerCorrect)",
      "INVALID_EXAM_CONFIG",
    );
  }

  let answerKey: Record<number, number>;
  try {
    answerKey =
      typeof answerKeyRaw === "string" ? JSON.parse(answerKeyRaw) : answerKeyRaw;
  } catch {
    throw Errors.validationFailed({ answerKey: "Must be valid JSON" });
  }

  const student = await prisma.student.findFirst({
    where: { id: studentId, tenantId, deletedAt: null },
  });
  if (!student) throw Errors.notFound("Student");

  try {
    const result = await scanOMR({
      fileBuffer: file.buffer,
      fileName: file.originalname,
      contentType: file.mimetype,
      totalQuestions: exam.totalQuestions,
      marksPerCorrect: Number(exam.marksPerCorrect),
      marksPerWrong: Number(exam.marksPerWrong ?? 0),
      marksPerUnattempted: Number(exam.marksPerUnattempted ?? 0),
      answerKey,
    });

    if (!result.needs_review) {
      const percentage =
        (result.score / Number(exam.totalMarks)) * 100;
      await withTenantTransaction(prisma, tenantId, async (tx) => {
        await tx.markEntry.upsert({
          where: { examId_studentId: { examId, studentId } },
          update: {
            marksObtained: result.score,
            mcqCorrect: result.correct,
            mcqIncorrect: result.incorrect,
            mcqUnattempted: result.unattempted,
            mcqPositiveMarks: result.positive_marks,
            mcqNegativeMarks: result.negative_marks,
            mcqNetMarks: result.score,
            percentage,
            enteredById: req.user!.id,
            enteredAt: new Date(),
            note: "Scanned by OMR",
          },
          create: {
            tenantId,
            examId,
            studentId,
            marksObtained: result.score,
            mcqCorrect: result.correct,
            mcqIncorrect: result.incorrect,
            mcqUnattempted: result.unattempted,
            mcqPositiveMarks: result.positive_marks,
            mcqNegativeMarks: result.negative_marks,
            mcqNetMarks: result.score,
            percentage,
            enteredById: req.user!.id,
            enteredAt: new Date(),
            note: "Scanned by OMR",
          },
        });
      });

      emitToTenant(tenantId, "omr:scanned", { examId, studentId, saved: true });
    } else {
      emitToTenant(tenantId, "omr:scanned", {
        examId,
        studentId,
        saved: false,
        flagged: result.flagged_questions.length,
      });
    }

    return ok(res, result);
  } catch (err) {
    if (err instanceof MLServiceError) {
      return res.status(err.statusCode).json({
        ok: false,
        error: {
          code: err.code,
          message: err.message,
          fallback: "Use manual marks entry until the ML service is restored.",
        },
      });
    }
    throw err;
  }
});

/**
 * POST /api/v1/omr/confirm
 * After tutor reviews flagged questions, save the confirmed marks.
 */
omrRouter.post("/confirm", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const {
    examId,
    studentId,
    marksObtained,
    correct,
    incorrect,
    unattempted,
  } = req.body as {
    examId: string;
    studentId: string;
    marksObtained: number;
    correct: number;
    incorrect: number;
    unattempted: number;
  };

  if (!examId || !studentId) {
    throw Errors.validationFailed({ examId: "Required", studentId: "Required" });
  }

  const exam = await prisma.exam.findFirst({
    where: { id: examId, tenantId, deletedAt: null },
  });
  if (!exam) throw Errors.notFound("Exam");

  const percentage = (Number(marksObtained) / Number(exam.totalMarks)) * 100;

  const entry = await withTenantTransaction(prisma, tenantId, (tx) =>
    tx.markEntry.upsert({
      where: { examId_studentId: { examId, studentId } },
      update: {
        marksObtained,
        mcqCorrect: correct,
        mcqIncorrect: incorrect,
        mcqUnattempted: unattempted,
        percentage,
        enteredById: req.user!.id,
        enteredAt: new Date(),
        note: "OMR scan + manual review",
      },
      create: {
        tenantId,
        examId,
        studentId,
        marksObtained,
        mcqCorrect: correct,
        mcqIncorrect: incorrect,
        mcqUnattempted: unattempted,
        percentage,
        enteredById: req.user!.id,
        enteredAt: new Date(),
        note: "OMR scan + manual review",
      },
    }),
  );

  emitToTenant(tenantId, "omr:confirmed", { examId, studentId });
  return ok(res, entry);
});
