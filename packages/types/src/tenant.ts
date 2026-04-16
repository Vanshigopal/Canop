import { z } from "zod";

export const TenantSlugSchema = z
  .string()
  .min(3, "Subdomain must be at least 3 characters")
  .max(30, "Subdomain must be at most 30 characters")
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, "Only lowercase letters, numbers, and hyphens")
  .refine(
    (s) => !["www", "api", "app", "admin", "mail", "ftp", "localhost"].includes(s),
    "This subdomain is reserved",
  );

export const TenantSchema = z.object({
  id: z.string().uuid(),
  slug: TenantSlugSchema,
  name: z.string().min(1),
  createdAt: z.string().datetime(),
});

export type Tenant = z.infer<typeof TenantSchema>;
