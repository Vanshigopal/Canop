import { z } from "zod";

const EnvSchema = z.object({
  VITE_API_URL: z.string().url().default("http://localhost:3001"),
});

export const env = EnvSchema.parse({
  VITE_API_URL: import.meta.env.VITE_API_URL,
});
