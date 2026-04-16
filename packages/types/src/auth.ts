import { z } from "zod";
import { TenantSlugSchema } from "./tenant";

export const LoginRequestSchema = z.object({
  tenantSlug: TenantSlugSchema,
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const LoginResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string(),
    role: z.enum(["admin", "teacher", "staff", "parent", "student"]),
  }),
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;
