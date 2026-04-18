import type { LLMProviderName } from "@prisma/client";
import type { LLMProvider } from "../types";
import { anthropicProvider } from "./anthropic";
import { stubProvider } from "./stub";

export function getProvider(providerName: LLMProviderName): LLMProvider {
  switch (providerName) {
    case "ANTHROPIC_CLAUDE":
      return anthropicProvider;
    default:
      return anthropicProvider;
  }
}

export { stubProvider };
