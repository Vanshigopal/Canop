import { z } from "zod";

export const ApiSuccessSchema = z.object({
  ok: z.literal(true),
  data: z.unknown(),
});

export const ApiErrorSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number(),
  code: z.string(),
  details: z.unknown().optional(),
});

export type ApiSuccess<T = unknown> = { ok: true; data: T };
export type ApiError = z.infer<typeof ApiErrorSchema>;
