import axios from "axios";
import type { LLMCallOptions, LLMCallResult, LLMMessage, LLMProvider } from "../types";

const PRICING: Record<string, { input: number; output: number }> = {
  "claude-3-5-sonnet-20241022": { input: 3.0, output: 15.0 },
  "claude-3-5-haiku-20241022": { input: 1.0, output: 5.0 },
  "claude-3-opus-20240229": { input: 15.0, output: 75.0 },
};

const DEFAULT_MODEL = "claude-3-5-sonnet-20241022";

export const anthropicProvider: LLMProvider = {
  name: "anthropic",

  async call(
    messages: LLMMessage[],
    options: LLMCallOptions,
    apiKey: string,
  ): Promise<LLMCallResult> {
    const model = options.model || DEFAULT_MODEL;
    const maxTokens = options.maxTokens ?? 1024;
    const temperature = options.temperature ?? 0.7;
    const timeout = options.timeout ?? 30000;

    const anthropicMessages = messages.filter((m) => m.role !== "system");
    const systemPrompt =
      options.system || messages.find((m) => m.role === "system")?.content || undefined;

    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: anthropicMessages.map((m) => ({ role: m.role, content: m.content })),
      },
      {
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        timeout,
      },
    );

    const data = response.data as {
      content?: Array<{ type: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
      model?: string;
      stop_reason?: string;
    };
    const textBlock = data.content?.find((b) => b.type === "text");

    return {
      content: textBlock?.text ?? "",
      inputTokens: data.usage?.input_tokens ?? 0,
      outputTokens: data.usage?.output_tokens ?? 0,
      model: data.model ?? model,
      stopReason: data.stop_reason,
      stubbed: false,
    };
  },

  async testConnection(apiKey: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const result = await this.call(
        [{ role: "user", content: "Reply with exactly: OK" }],
        { model: "claude-3-5-haiku-20241022", maxTokens: 10 },
        apiKey,
      );
      return { ok: result.content.trim().toUpperCase().includes("OK") };
    } catch (err) {
      const e = err as { response?: { status?: number }; message?: string };
      if (e.response?.status === 401) return { ok: false, error: "Invalid API key" };
      if (e.response?.status === 429) return { ok: false, error: "Rate limit or quota exceeded" };
      return { ok: false, error: e.message || "Unknown error" };
    }
  },

  estimateCostCents(inputTokens: number, outputTokens: number, model: string): number {
    const pricing = PRICING[model] ?? PRICING[DEFAULT_MODEL] ?? { input: 0, output: 0 };
    const inputCost = (inputTokens / 1_000_000) * pricing.input * 100;
    const outputCost = (outputTokens / 1_000_000) * pricing.output * 100;
    return Math.round((inputCost + outputCost) * 10000) / 10000;
  },
};
