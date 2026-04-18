import { ok } from "@/lib/response";
import { authenticate, requireRole } from "@/middleware/auth";
import { callLLM } from "@/services/llm";
import { Router } from "express";
import { z } from "zod";

export const llmTestRouter = Router();
llmTestRouter.use(authenticate, requireRole("ADMIN"));

const testCallSchema = z.object({
  featureKey: z.string().max(50).optional(),
  message: z.string().max(4000).optional(),
});

llmTestRouter.post("/test-call", async (req, res) => {
  const body = testCallSchema.parse(req.body);
  const result = await callLLM({
    tenantId: req.user!.tenantId,
    userId: req.user!.id,
    featureKey: body.featureKey || "default",
    messages: [{ role: "user", content: body.message || "Hello" }],
  });
  return ok(res, result);
});
