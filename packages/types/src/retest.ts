import { z } from "zod";

export const RetestStatusSchema = z.enum([
  "PENDING_SCHEDULE",
  "SCHEDULED",
  "COMPLETED",
  "NO_SHOW",
  "CANCELLED",
]);
export type RetestStatus = z.infer<typeof RetestStatusSchema>;

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timeStr = z.string().regex(/^\d{2}:\d{2}$/);

export const ScheduleRetestSchema = z.object({
  scheduledDate: dateStr,
  scheduledTime: timeStr,
  note: z.string().max(500).optional(),
});
export type ScheduleRetest = z.infer<typeof ScheduleRetestSchema>;

export const MarkRetestAttendedSchema = z.object({
  attendedAt: z.string().datetime().optional(),
});
export type MarkRetestAttended = z.infer<typeof MarkRetestAttendedSchema>;

export const EnterRetestMarksSchema = z.object({
  retestMarks: z.number().nonnegative().optional(),
  retestTheoryMarks: z.number().nonnegative().optional(),
  retestMcqCorrect: z.number().int().nonnegative().optional(),
  retestMcqIncorrect: z.number().int().nonnegative().optional(),
  retestMcqUnattempted: z.number().int().nonnegative().optional(),
  note: z.string().max(500).optional(),
});
export type EnterRetestMarks = z.infer<typeof EnterRetestMarksSchema>;

export const CancelRetestSchema = z.object({
  note: z.string().max(500).optional(),
});
export type CancelRetest = z.infer<typeof CancelRetestSchema>;
