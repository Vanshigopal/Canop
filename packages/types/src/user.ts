import { z } from "zod";

export const UserRoleSchema = z.enum(["admin", "teacher", "staff", "parent", "student"]);

export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  tenantId: z.string().uuid(),
  role: UserRoleSchema,
  createdAt: z.string().datetime(),
});

export type User = z.infer<typeof UserSchema>;
