import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3001),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  DATABASE_URL: z.string().url().default("postgresql://raquel:raquel_dev_password@localhost:5432/raquel_dev?schema=public"),
});

export const env = EnvSchema.parse(process.env);
