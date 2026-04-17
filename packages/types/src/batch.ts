import { z } from "zod";

export const CreateBatchSchema = z.object({
  classId: z.string().uuid(),
  name: z.string().min(1).max(100),
  capacity: z.number().int().min(1).default(60),
  academicYear: z.string().regex(/^\d{4}-\d{4}$/),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});
export type CreateBatch = z.infer<typeof CreateBatchSchema>;

export const UpdateBatchSchema = CreateBatchSchema.partial();
export type UpdateBatch = z.infer<typeof UpdateBatchSchema>;

export const BatchSubjectAssignSchema = z.object({
  subjects: z.array(
    z.object({
      subjectId: z.string().uuid(),
      teacherId: z.string().uuid().optional(),
    }),
  ),
});
export type BatchSubjectAssign = z.infer<typeof BatchSubjectAssignSchema>;
