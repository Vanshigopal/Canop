import { createHash } from "node:crypto";
import { prisma, withTenantTransaction } from "@/config/db";
import { env } from "@/config/env";
import { decrypt } from "@/lib/encryption";
import type { LLMConfig, LLMRequestStatus, LLMSpendCap, PrismaClient } from "@prisma/client";
import { getProvider, stubProvider } from "./providers";
import { type RedactionContext, redactText } from "./redaction";
import type { LLMCallOptions, LLMMessage } from "./types";

export type { LLMMessage, LLMCallOptions } from "./types";
export type { RedactionContext } from "./redaction";

export interface LLMRequest {
  tenantId: string;
  userId?: string;
  featureKey: string;
  messages: LLMMessage[];
  options?: LLMCallOptions;
  redactionContext?: RedactionContext;
}

export interface LLMResponse {
  ok: boolean;
  content?: string;
  error?: {
    code: string;
    message: string;
    userMessage: string;
  };
  stubbed: boolean;
  tokens?: { input: number; output: number };
  costCents?: number;
  durationMs: number;
}

type Tx = PrismaClient;
type EffectiveConfig = LLMConfig & { spendCap: LLMSpendCap | null };

export async function callLLM(req: LLMRequest): Promise<LLMResponse> {
  const startTime = Date.now();

  return withTenantTransaction(prisma, req.tenantId, async (tx) => {
    let effective = (await tx.lLMConfig.findUnique({
      where: { tenantId: req.tenantId },
      include: { spendCap: true },
    })) as EffectiveConfig | null;

    if (!effective) {
      effective = (await tx.lLMConfig.create({
        data: { tenantId: req.tenantId, mode: "DISABLED" },
        include: { spendCap: true },
      })) as EffectiveConfig;
    }

    if (effective.mode === "DISABLED") {
      return dispatchStub(tx, req, effective, startTime);
    }

    if (!isFeatureEnabled(req.featureKey, effective)) {
      return dispatchStub(tx, req, effective, startTime, "FAILED_DISABLED");
    }

    if (effective.spendCap) {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const cap = effective.spendCap;

      if (cap.currentMonth !== currentMonth) {
        const monthStart = new Date(`${currentMonth}-01T00:00:00Z`);
        const total = await tx.lLMRequestLog.aggregate({
          where: { tenantId: req.tenantId, createdAt: { gte: monthStart } },
          _sum: { estimatedCostCents: true },
        });
        const rolledOver = Number(total._sum.estimatedCostCents || 0);
        await tx.lLMSpendCap.update({
          where: { id: cap.id },
          data: {
            currentMonth,
            currentMonthCents: rolledOver,
            alertedAt50: null,
            alertedAt80: null,
            alertedAt100: null,
          },
        });
        cap.currentMonth = currentMonth;
        cap.currentMonthCents = total._sum.estimatedCostCents || cap.currentMonthCents;
      }

      if (Number(cap.currentMonthCents) >= Number(cap.monthlyCapCents)) {
        await writeLog(tx, req, effective, {
          status: "FAILED_CAP_REACHED",
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          estimatedCostCents: 0,
          durationMs: Date.now() - startTime,
          errorCode: "SPEND_CAP_REACHED",
          errorMessage: "Monthly AI spending cap reached for this tenant.",
        });
        return {
          ok: false,
          error: {
            code: "SPEND_CAP_REACHED",
            message: "Monthly spend cap reached.",
            userMessage:
              "Your institute's AI budget for this month has been reached. Contact admin to raise the cap.",
          },
          stubbed: false,
          durationMs: Date.now() - startTime,
        };
      }
    }

    let apiKey: string | null = null;
    if (effective.mode === "BRING_YOUR_OWN_KEY") {
      if (!effective.encryptedApiKey) {
        return dispatchStub(tx, req, effective, startTime, "FAILED_INVALID_KEY");
      }
      try {
        apiKey = decrypt(effective.encryptedApiKey);
      } catch {
        return dispatchStub(tx, req, effective, startTime, "FAILED_INVALID_KEY");
      }
    } else if (effective.mode === "PLATFORM_KEY") {
      apiKey = env.ANTHROPIC_API_KEY || null;
      if (!apiKey) {
        return dispatchStub(tx, req, effective, startTime, "FAILED_INVALID_KEY");
      }
    }

    if (!apiKey) {
      return dispatchStub(tx, req, effective, startTime, "FAILED_INVALID_KEY");
    }

    const provider = getProvider(effective.provider);
    const model = req.options?.model || effective.preferredModel;

    const redactedMessages: LLMMessage[] = req.messages.map((m) => {
      const { redactedText } = redactText(m.content, effective, req.redactionContext || {});
      return { role: m.role, content: redactedText };
    });

    try {
      const result = await provider.call(
        redactedMessages,
        { ...req.options, model, timeout: req.options?.timeout || 30000 },
        apiKey,
      );

      const costCents = provider.estimateCostCents(
        result.inputTokens,
        result.outputTokens,
        result.model,
      );

      const durationMs = Date.now() - startTime;

      await writeLog(tx, req, effective, {
        status: "SUCCESS",
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        totalTokens: result.inputTokens + result.outputTokens,
        estimatedCostCents: costCents,
        durationMs,
      });

      if (effective.spendCap) {
        await tx.lLMSpendCap.update({
          where: { id: effective.spendCap.id },
          data: { currentMonthCents: { increment: costCents } },
        });
      }

      return {
        ok: true,
        content: result.content,
        stubbed: false,
        tokens: { input: result.inputTokens, output: result.outputTokens },
        costCents,
        durationMs,
      };
    } catch (err) {
      const e = err as { response?: { status?: number }; code?: string; message?: string };
      const errorCode =
        e.response?.status === 401
          ? "INVALID_API_KEY"
          : e.response?.status === 429
            ? "RATE_LIMIT"
            : e.code === "ECONNABORTED"
              ? "TIMEOUT"
              : "PROVIDER_ERROR";

      const status: LLMRequestStatus =
        errorCode === "INVALID_API_KEY"
          ? "FAILED_INVALID_KEY"
          : errorCode === "RATE_LIMIT"
            ? "FAILED_RATE_LIMIT"
            : errorCode === "TIMEOUT"
              ? "FAILED_TIMEOUT"
              : "FAILED_PROVIDER_ERROR";

      const durationMs = Date.now() - startTime;

      await writeLog(tx, req, effective, {
        status,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCostCents: 0,
        durationMs,
        errorCode,
        errorMessage: (e.message || "").substring(0, 500),
      });

      return {
        ok: false,
        error: {
          code: errorCode,
          message: e.message || "LLM call failed",
          userMessage: "AI service temporarily unavailable. Please try again shortly.",
        },
        stubbed: false,
        durationMs,
      };
    }
  });
}

async function dispatchStub(
  tx: Tx,
  req: LLMRequest,
  config: EffectiveConfig,
  startTime: number,
  explicitStatus?: LLMRequestStatus,
): Promise<LLMResponse> {
  const options: LLMCallOptions & { _featureKey?: string } = {
    ...req.options,
    _featureKey: req.featureKey,
  };
  const result = await stubProvider.call(req.messages, options, "");
  const durationMs = Date.now() - startTime;

  await writeLog(tx, req, config, {
    status: explicitStatus || "STUBBED",
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    totalTokens: result.inputTokens + result.outputTokens,
    estimatedCostCents: 0,
    durationMs,
  });

  return {
    ok: true,
    content: result.content,
    stubbed: true,
    tokens: { input: result.inputTokens, output: result.outputTokens },
    costCents: 0,
    durationMs,
  };
}

async function writeLog(
  tx: Tx,
  req: LLMRequest,
  config: EffectiveConfig,
  data: {
    status: LLMRequestStatus;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCostCents: number;
    durationMs: number;
    errorCode?: string;
    errorMessage?: string;
  },
) {
  const promptHash = createHash("sha256").update(JSON.stringify(req.messages)).digest("hex");

  return tx.lLMRequestLog.create({
    data: {
      tenantId: req.tenantId,
      configId: config.id,
      userId: req.userId,
      featureKey: req.featureKey,
      provider: config.provider,
      model: req.options?.model || config.preferredModel,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      totalTokens: data.totalTokens,
      estimatedCostCents: data.estimatedCostCents,
      status: data.status,
      errorCode: data.errorCode,
      errorMessage: data.errorMessage,
      durationMs: data.durationMs,
      promptHash,
    },
  });
}

function isFeatureEnabled(featureKey: string, config: LLMConfig): boolean {
  switch (featureKey) {
    case "chatbot":
      return config.enableAiChatbot;
    case "report":
      return config.enableAiReports;
    case "translation":
      return config.enableAiTranslation;
    case "question_gen":
      return config.enableAiQuestionGen;
    default:
      return true;
  }
}
