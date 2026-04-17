import { z } from "zod";

export const AttendanceTypeSchema = z.enum(["LECTURE", "EXAM", "RETEST"]);
export const AttendanceStatusSchema = z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]);
export const AttendanceMethodSchema = z.enum(["QR_SCAN", "MANUAL", "BULK"]);

export const CreateAttendanceSessionSchema = z.object({
  batchId: z.string().uuid(),
  subjectId: z.string().uuid().optional(),
  type: AttendanceTypeSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  note: z.string().max(500).optional(),
  examId: z.string().uuid().optional(),
  retestId: z.string().uuid().optional(),
});

export const UpdateAttendanceSessionSchema = z.object({
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  subjectId: z.string().uuid().nullable().optional(),
  note: z.string().max(500).nullable().optional(),
});

export const MarkAttendanceSchema = z.object({
  studentId: z.string().uuid(),
  status: AttendanceStatusSchema,
  method: AttendanceMethodSchema.default("MANUAL"),
  note: z.string().max(300).optional(),
  lateMinutes: z.number().int().min(0).max(180).optional(),
});

export const BulkMarkAttendanceSchema = z.object({
  records: z
    .array(
      z.object({
        studentId: z.string().uuid(),
        status: AttendanceStatusSchema,
        note: z.string().max(300).optional(),
        lateMinutes: z.number().int().min(0).max(180).optional(),
      }),
    )
    .min(1),
  method: AttendanceMethodSchema.default("MANUAL"),
});

export const MarkAllAttendanceSchema = z.object({
  status: AttendanceStatusSchema.default("PRESENT"),
  method: AttendanceMethodSchema.default("BULK"),
});

export const AddGuestStudentSchema = z.object({
  studentId: z.string().uuid(),
  status: AttendanceStatusSchema.default("PRESENT"),
  note: z.string().max(300).optional(),
});

export const UpdateAttendanceRecordSchema = z.object({
  status: AttendanceStatusSchema.optional(),
  note: z.string().max(300).nullable().optional(),
  lateMinutes: z.number().int().min(0).max(180).nullable().optional(),
});

export const QrVerifySchema = z.object({
  qrCode: z.string().length(64),
});

export type AttendanceType = z.infer<typeof AttendanceTypeSchema>;
export type AttendanceStatus = z.infer<typeof AttendanceStatusSchema>;
export type AttendanceMethod = z.infer<typeof AttendanceMethodSchema>;
export type CreateAttendanceSession = z.infer<typeof CreateAttendanceSessionSchema>;
export type UpdateAttendanceSession = z.infer<typeof UpdateAttendanceSessionSchema>;
export type MarkAttendance = z.infer<typeof MarkAttendanceSchema>;
export type BulkMarkAttendance = z.infer<typeof BulkMarkAttendanceSchema>;
export type MarkAllAttendance = z.infer<typeof MarkAllAttendanceSchema>;
export type AddGuestStudent = z.infer<typeof AddGuestStudentSchema>;
export type UpdateAttendanceRecord = z.infer<typeof UpdateAttendanceRecordSchema>;
export type QrVerify = z.infer<typeof QrVerifySchema>;
