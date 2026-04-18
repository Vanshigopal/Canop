import type { LLMCallOptions, LLMCallResult, LLMMessage, LLMProvider } from "../types";

const STUB_RESPONSES: Record<string, (messages: LLMMessage[]) => string> = {
  default: () =>
    "[STUB RESPONSE] This is a simulated AI response for local development. " +
    "Configure a real Anthropic API key in Settings → AI Features to enable live AI.",

  chatbot: (messages) => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content || "";
    if (/attendance|present|absent/i.test(lastUser)) {
      return "[STUB] Based on the attendance data, the overall rate this week is 87%. Three students had perfect attendance, and two dropped below 70%.";
    }
    if (/marks|exam|result/i.test(lastUser)) {
      return "[STUB] The last exam average was 68%. The highest scorer was Priya Sharma at 92%, and the batch median was 70%.";
    }
    if (/fee|payment/i.test(lastUser)) {
      return "[STUB] This month, ₹4,82,000 has been collected out of ₹6,50,000 expected. Three installments are overdue.";
    }
    return (
      "[STUB CHATBOT] I'm a simulated AI assistant. Real responses will come from Claude when an API key is configured. Your question was: " +
      lastUser.substring(0, 100)
    );
  },

  report: () =>
    "[STUB REPORT] April was a productive month. Attendance remained strong at 89%, " +
    "and exam performance showed an upward trend (+4% vs March). Focus areas: chemistry, " +
    "where the batch average dropped from 72% to 65%. Recommended: review organic chemistry " +
    "chapters before next exam.",

  translation: (messages) => {
    const original = [...messages].reverse().find((m) => m.role === "user")?.content || "";
    return `[STUB TRANSLATION of "${original.substring(0, 50)}..."] यह एक simulated translation है। Real translation will be provided when AI is configured.`;
  },

  question_gen: () =>
    JSON.stringify([
      {
        question: "[STUB Q1] What is the chemical symbol for water?",
        options: ["H2O", "CO2", "O2", "NaCl"],
        correct: 0,
      },
      { question: "[STUB Q2] What is 15 × 8?", options: ["100", "110", "120", "130"], correct: 2 },
      {
        question: "[STUB Q3] Which planet is closest to the sun?",
        options: ["Venus", "Mars", "Mercury", "Earth"],
        correct: 2,
      },
    ]),
};

export const stubProvider: LLMProvider = {
  name: "stub",

  async call(
    messages: LLMMessage[],
    options: LLMCallOptions,
    _apiKey: string,
  ): Promise<LLMCallResult> {
    await new Promise((r) => setTimeout(r, 250 + Math.random() * 250));

    const featureKey =
      (options as LLMCallOptions & { _featureKey?: string })._featureKey || "default";
    const generator = STUB_RESPONSES[featureKey] ?? STUB_RESPONSES.default!;
    const content = generator(messages);

    const inputTokens = messages.reduce((s, m) => s + Math.ceil(m.content.length / 4), 0);
    const outputTokens = Math.ceil(content.length / 4);

    return {
      content,
      inputTokens,
      outputTokens,
      model: "stub-model-v1",
      stopReason: "end_turn",
      stubbed: true,
    };
  },

  async testConnection(_apiKey: string): Promise<{ ok: boolean; error?: string }> {
    return { ok: true };
  },

  estimateCostCents(_inputTokens: number, _outputTokens: number, _model: string): number {
    return 0;
  },
};
