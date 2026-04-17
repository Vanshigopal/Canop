import { z } from "zod";

export const CreateClassSchema = z.object({
  name: z.string().min(1).max(50),
  orderIndex: z.number().int().min(0).optional(),
});
export type CreateClass = z.infer<typeof CreateClassSchema>;

export const UpdateClassSchema = CreateClassSchema.partial();
export type UpdateClass = z.infer<typeof UpdateClassSchema>;

export const ClassSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  orderIndex: z.number(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ClassStandard = z.infer<typeof ClassSchema>;
