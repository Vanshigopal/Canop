export interface LLMMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface LLMCallOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  system?: string;
  timeout?: number;
}

export interface LLMCallResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
  stopReason?: string;
  stubbed: boolean;
}

export interface LLMProvider {
  name: string;
  call(messages: LLMMessage[], options: LLMCallOptions, apiKey: string): Promise<LLMCallResult>;
  testConnection(apiKey: string): Promise<{ ok: boolean; error?: string }>;
  estimateCostCents(inputTokens: number, outputTokens: number, model: string): number;
}
