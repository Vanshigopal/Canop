import { prisma, withTenantTransaction } from "@/config/db";
import { env } from "@/config/env";
import { emitToTenant } from "@/config/socket";
import { decrypt, encrypt, maskApiKey } from "@/lib/encryption";
import { Errors } from "@/lib/errors";
import { ok } from "@/lib/response";
import { authenticate, requireRole } from "@/middleware/auth";
import { getProvider } from "@/services/llm/providers";
import type { LLMRequestStatus } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";

const LLM_REQUEST_STATUSES = [
  "SUCCESS",
  "STUBBED",
  "FAILED_DISABLED",
  "FAILED_CAP_REACHED",
  "FAILED_INVALID_KEY",
  "FAILED_RATE_LIMIT",
  "FAILED_PROVIDER_ERROR",
  "FAILED_TIMEOUT",
  "FAILED_REDACTION",
] as const;

export const llmConfigRouter = Router();
llmConfigRouter.use(authenticate, requireRole("ADMIN"));

llmConfigRouter.get("/", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const config = await withTenantTransaction(prisma, tenantId, async (tx) => {
    let c = await tx.lLMConfig.findUnique({
      where: { tenantId },
      include: { spendCap: true },
    });
    if (!c) {
      c = await tx.lLMConfig.create({
        data: { tenantId },
        include: { spendCap: true },
      });
    }
    return c;
  });

  let maskedKey: string | null = null;
  if (config.encryptedApiKey) {
    try {
      maskedKey = maskApiKey(decrypt(config.encryptedApiKey));
    } catch {
      maskedKey = "••••";
    }
  }

  return ok(res, {
    mode: config.mode,
    provider: config.provider,
    preferredModel: config.preferredModel,
    apiKeyMasked: maskedKey,
    apiKeyLastTestedAt: config.apiKeyLastTestedAt,
    apiKeyLastTestStatus: config.apiKeyLastTestStatus,
    privacy: {
      shareStudentNames: config.shareStudentNames,
      shareParentNames: config.shareParentNames,
      shareExamMarks: config.shareExamMarks,
      shareAttendanceData: config.shareAttendanceData,
      shareContactInfo: config.shareContactInfo,
    },
    features: {
      chatbot: config.enableAiChatbot,
      reports: config.enableAiReports,
      translation: config.enableAiTranslation,
      questionGen: config.enableAiQuestionGen,
    },
    spendCap: config.spendCap
      ? {
          monthlyCapCents: Number(config.spendCap.monthlyCapCents),
          currentMonthCents: Number(config.spendCap.currentMonthCents),
          currentMonth: config.spendCap.currentMonth,
        }
      : null,
    platformKeyAvailable: Boolean(env.ANTHROPIC_API_KEY),
  });
});

const updateSchema = z.object({
  mode: z.enum(["DISABLED", "PLATFORM_KEY", "BRING_YOUR_OWN_KEY"]).optional(),
  preferredModel: z.string().max(100).optional(),
  apiKey: z.string().optional(),
  privacy: z
    .object({
      shareStudentNames: z.boolean().optional(),
      shareParentNames: z.boolean().optional(),
      shareExamMarks: z.boolean().optional(),
      shareAttendanceData: z.boolean().optional(),
      shareContactInfo: z.boolean().optional(),
    })
    .optional(),
  features: z
    .object({
      chatbot: z.boolean().optional(),
      reports: z.boolean().optional(),
      translation: z.boolean().optional(),
      questionGen: z.boolean().optional(),
    })
    .optional(),
  monthlyCapCents: z.number().int().min(0).max(1_000_000_000).optional(),
});

llmConfigRouter.patch("/", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const body = updateSchema.parse(req.body);

  const updated = await withTenantTransaction(prisma, tenantId, async (tx) => {
    const existing = await tx.lLMConfig.findUnique({ where: { tenantId } });
    if (!existing) throw Errors.notFound("LLMConfig");

    const data: Record<string, unknown> = {};
    if (body.mode !== undefined) data.mode = body.mode;
    if (body.preferredModel !== undefined) data.preferredModel = body.preferredModel;
    if (body.apiKey !== undefined) {
      if (body.apiKey === "") {
        data.encryptedApiKey = null;
        data.apiKeyLastTestedAt = null;
        data.apiKeyLastTestStatus = null;
      } else {
        data.encryptedApiKey = encrypt(body.apiKey);
        data.apiKeyLastTestedAt = null;
        data.apiKeyLastTestStatus = null;
      }
    }
    if (body.privacy) {
      if (body.privacy.shareStudentNames !== undefined)
        data.shareStudentNames = body.privacy.shareStudentNames;
      if (body.privacy.shareParentNames !== undefined)
        data.shareParentNames = body.privacy.shareParentNames;
      if (body.privacy.shareExamMarks !== undefined)
        data.shareExamMarks = body.privacy.shareExamMarks;
      if (body.privacy.shareAttendanceData !== undefined)
        data.shareAttendanceData = body.privacy.shareAttendanceData;
      if (body.privacy.shareContactInfo !== undefined)
        data.shareContactInfo = body.privacy.shareContactInfo;
    }
    if (body.features) {
      if (body.features.chatbot !== undefined) data.enableAiChatbot = body.features.chatbot;
      if (body.features.reports !== undefined) data.enableAiReports = body.features.reports;
      if (body.features.translation !== undefined)
        data.enableAiTranslation = body.features.translation;
      if (body.features.questionGen !== undefined)
        data.enableAiQuestionGen = body.features.questionGen;
    }

    const config = await tx.lLMConfig.update({ where: { tenantId }, data });

    if (body.monthlyCapCents !== undefined) {
      const existingCap = await tx.lLMSpendCap.findUnique({ where: { tenantId } });
      if (existingCap) {
        await tx.lLMSpendCap.update({
          where: { id: existingCap.id },
          data: { monthlyCapCents: body.monthlyCapCents },
        });
      } else {
        await tx.lLMSpendCap.create({
          data: {
            tenantId,
            configId: config.id,
            monthlyCapCents: body.monthlyCapCents,
            currentMonth: new Date().toISOString().slice(0, 7),
          },
        });
      }
    }

    return config;
  });

  emitToTenant(tenantId, "llm:config-updated", { mode: updated.mode });
  return ok(res, { success: true });
});

llmConfigRouter.post("/test", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const config = await withTenantTransaction(prisma, tenantId, async (tx) => {
    return tx.lLMConfig.findUnique({ where: { tenantId } });
  });
  if (!config) throw Errors.notFound("LLMConfig");

  let apiKey: string | null = null;
  if (config.mode === "BRING_YOUR_OWN_KEY" && config.encryptedApiKey) {
    try {
      apiKey = decrypt(config.encryptedApiKey);
    } catch {
      apiKey = null;
    }
  } else if (config.mode === "PLATFORM_KEY") {
    apiKey = env.ANTHROPIC_API_KEY || null;
  }

  if (!apiKey) {
    return res.status(400).json({
      ok: false,
      error: { code: "NO_API_KEY", message: "No API key configured" },
    });
  }

  const provider = getProvider(config.provider);
  const result = await provider.testConnection(apiKey);

  await withTenantTransaction(prisma, tenantId, async (tx) => {
    await tx.lLMConfig.update({
      where: { tenantId },
      data: {
        apiKeyLastTestedAt: new Date(),
        apiKeyLastTestStatus: result.ok ? "success" : "invalid",
      },
    });
  });

  return ok(res, result);
});

llmConfigRouter.get("/usage", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthStart = new Date(`${currentMonth}-01T00:00:00Z`);

  const summary = await withTenantTransaction(prisma, tenantId, async (tx) => {
    const [total, byFeature, byStatus, recent] = await Promise.all([
      tx.lLMRequestLog.aggregate({
        where: { tenantId, createdAt: { gte: monthStart } },
        _sum: { inputTokens: true, outputTokens: true, estimatedCostCents: true },
        _count: true,
      }),
      tx.lLMRequestLog.groupBy({
        by: ["featureKey"],
        where: { tenantId, createdAt: { gte: monthStart } },
        _sum: { estimatedCostCents: true },
        _count: true,
      }),
      tx.lLMRequestLog.groupBy({
        by: ["status"],
        where: { tenantId, createdAt: { gte: monthStart } },
        _count: true,
      }),
      tx.lLMRequestLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          featureKey: true,
          model: true,
          status: true,
          inputTokens: true,
          outputTokens: true,
          estimatedCostCents: true,
          durationMs: true,
          errorCode: true,
          createdAt: true,
        },
      }),
    ]);

    const dailyRaw = await tx.lLMRequestLog.findMany({
      where: { tenantId, createdAt: { gte: monthStart } },
      select: { createdAt: true, estimatedCostCents: true },
    });
    const dailyMap = new Map<string, number>();
    for (const r of dailyRaw) {
      const day = r.createdAt.toISOString().slice(0, 10);
      dailyMap.set(day, (dailyMap.get(day) || 0) + Number(r.estimatedCostCents));
    }
    const daily = Array.from(dailyMap.entries())
      .map(([date, costCents]) => ({ date, costCents }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      currentMonth,
      total: {
        requests: total._count,
        inputTokens: total._sum.inputTokens || 0,
        outputTokens: total._sum.outputTokens || 0,
        costCents: Number(total._sum.estimatedCostCents || 0),
      },
      byFeature: byFeature.map((f) => ({
        featureKey: f.featureKey,
        requests: f._count,
        costCents: Number(f._sum.estimatedCostCents || 0),
      })),
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
      recent: recent.map((r) => ({
        ...r,
        estimatedCostCents: Number(r.estimatedCostCents),
      })),
      daily,
    };
  });

  return ok(res, summary);
});

llmConfigRouter.get("/logs", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const cursor = req.query.cursor as string | undefined;
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const featureKey = req.query.featureKey as string | undefined;
  const statusParam = req.query.status as string | undefined;

  const statusFilter =
    statusParam && (LLM_REQUEST_STATUSES as readonly string[]).includes(statusParam)
      ? (statusParam as LLMRequestStatus)
      : undefined;

  const logs = await withTenantTransaction(prisma, tenantId, async (tx) => {
    return tx.lLMRequestLog.findMany({
      where: {
        tenantId,
        ...(featureKey ? { featureKey } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
  });

  return ok(
    res,
    logs.map((l) => ({ ...l, estimatedCostCents: Number(l.estimatedCostCents) })),
  );
});
