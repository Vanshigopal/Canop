import { z } from "zod";

export const ExamTypeSchema = z.enum(["THEORY", "MCQ", "THEORY_MCQ", "OBJECTIVE", "NUMERICAL"]);
export type ExamType = z.infer<typeof ExamTypeSchema>;

export const ExamStatusSchema = z.enum([
  "DRAFT",
  "SCHEDULED",
  "IN_PROGRESS",
  "MARKS_ENTRY",
  "UNDER_REVIEW",
  "PUBLISHED",
  "CANCELLED",
]);
export type ExamStatus = z.infer<typeof ExamStatusSchema>;

export const CutOffTypeSchema = z.enum(["MARKS", "PERCENTAGE"]);
export type CutOffType = z.infer<typeof CutOffTypeSchema>;

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timeStr = z.string().regex(/^\d{2}:\d{2}$/);

export const CreateExamSchema = z
  .object({
    batchId: z.string().uuid(),
    subjectId: z.string().uuid().nullable().optional(),
    name: z.string().min(1).max(200),
    description: z.string().max(500).optional(),
    type: ExamTypeSchema,
    totalMarks: z.number().positive(),
    cutOffType: CutOffTypeSchema.default("PERCENTAGE"),
    passingMarks: z.number().nonnegative().optional(),
    passingPercent: z.number().min(0).max(100).optional(),

    // MCQ
    totalQuestions: z.number().int().positive().optional(),
    marksPerCorrect: z.number().positive().optional(),
    marksPerWrong: z.number().optional(),
    marksPerUnattempted: z.number().optional(),

    // THEORY_MCQ
    theoryMaxMarks: z.number().nonnegative().optional(),
    mcqMaxMarks: z.number().nonnegative().optional(),
    mcqQuestionCount: z.number().int().positive().optional(),

    // Schedule
    examDate: dateStr.optional(),
    startTime: timeStr.optional(),
    endTime: timeStr.optional(),
    duration: z.number().int().positive().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.type === "MCQ" || val.type === "THEORY_MCQ") {
      if (!val.totalQuestions || val.totalQuestions < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["totalQuestions"],
          message: "MCQ exams need total question count",
        });
      }
      if (val.marksPerCorrect == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["marksPerCorrect"],
          message: "Marks per correct answer required",
        });
      }
    }
    if (val.type === "THEORY_MCQ") {
      if (val.theoryMaxMarks == null || val.mcqMaxMarks == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["theoryMaxMarks"],
          message: "Theory and MCQ section max marks required for combined exams",
        });
      } else if (Math.abs(val.theoryMaxMarks + val.mcqMaxMarks - val.totalMarks) > 0.01) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["theoryMaxMarks"],
          message: "Theory + MCQ section marks must equal total marks",
        });
      }
    }
    if (val.cutOffType === "MARKS" && val.passingMarks == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["passingMarks"],
        message: "Passing marks required when cut-off type is MARKS",
      });
    }
    if (val.cutOffType === "PERCENTAGE" && val.passingPercent == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["passingPercent"],
        message: "Passing percent required when cut-off type is PERCENTAGE",
      });
    }
  });
export type CreateExam = z.infer<typeof CreateExamSchema>;

export const UpdateExamSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).nullable().optional(),
  totalMarks: z.number().positive().optional(),
  passingMarks: z.number().nonnegative().nullable().optional(),
  passingPercent: z.number().min(0).max(100).nullable().optional(),
  cutOffType: CutOffTypeSchema.optional(),
  totalQuestions: z.number().int().positive().nullable().optional(),
  marksPerCorrect: z.number().positive().nullable().optional(),
  marksPerWrong: z.number().nullable().optional(),
  marksPerUnattempted: z.number().nullable().optional(),
  theoryMaxMarks: z.number().nonnegative().nullable().optional(),
  mcqMaxMarks: z.number().nonnegative().nullable().optional(),
  mcqQuestionCount: z.number().int().positive().nullable().optional(),
  examDate: dateStr.nullable().optional(),
  startTime: timeStr.nullable().optional(),
  endTime: timeStr.nullable().optional(),
  duration: z.number().int().positive().nullable().optional(),
});
export type UpdateExam = z.infer<typeof UpdateExamSchema>;

export const ScheduleExamSchema = z.object({
  examDate: dateStr,
  startTime: timeStr.optional(),
  endTime: timeStr.optional(),
  duration: z.number().int().positive().optional(),
});
export type ScheduleExam = z.infer<typeof ScheduleExamSchema>;

export const EnterMarksSchema = z.object({
  studentId: z.string().uuid(),
  marksObtained: z.number().nonnegative().optional(),
  theoryMarks: z.number().nonnegative().optional(),
  mcqCorrect: z.number().int().nonnegative().optional(),
  mcqIncorrect: z.number().int().nonnegative().optional(),
  mcqUnattempted: z.number().int().nonnegative().optional(),
  isAbsent: z.boolean().optional(),
  note: z.string().max(300).optional(),
});
export type EnterMarks = z.infer<typeof EnterMarksSchema>;

export const BulkEnterMarksSchema = z.object({
  entries: z.array(EnterMarksSchema).min(1),
});
export type BulkEnterMarks = z.infer<typeof BulkEnterMarksSchema>;
