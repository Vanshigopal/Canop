import type { LLMConfig } from "@prisma/client";

export interface RedactionContext {
  studentNames?: string[];
  parentNames?: string[];
  phoneNumbers?: string[];
  emails?: string[];
  addresses?: string[];
}

interface RedactionResult {
  redactedText: string;
  pseudonymMap: Record<string, string>;
}

export function redactText(
  text: string,
  config: LLMConfig,
  context: RedactionContext = {},
): RedactionResult {
  const pseudonymMap: Record<string, string> = {};
  let result = text;

  if (!config.shareStudentNames && context.studentNames) {
    context.studentNames.forEach((name, idx) => {
      if (!name) return;
      const pseudonym = `Student ${String.fromCharCode(65 + (idx % 26))}${idx >= 26 ? Math.floor(idx / 26) : ""}`;
      const regex = new RegExp(`\\b${escapeRegex(name)}\\b`, "gi");
      if (regex.test(result)) {
        result = result.replace(regex, pseudonym);
        pseudonymMap[pseudonym] = name;
      }
    });
  }

  if (!config.shareParentNames && context.parentNames) {
    context.parentNames.forEach((name, idx) => {
      if (!name) return;
      const pseudonym = `Parent ${String.fromCharCode(65 + (idx % 26))}${idx >= 26 ? Math.floor(idx / 26) : ""}`;
      const regex = new RegExp(`\\b${escapeRegex(name)}\\b`, "gi");
      if (regex.test(result)) {
        result = result.replace(regex, pseudonym);
        pseudonymMap[pseudonym] = name;
      }
    });
  }

  if (!config.shareContactInfo) {
    result = result.replace(/(\+?91[-\s]?)?(\d{10})/g, (_match, _cc, num: string) => {
      const pseudo = `[PHONE-${num.slice(-4)}]`;
      pseudonymMap[pseudo] = num;
      return pseudo;
    });
  }

  if (!config.shareContactInfo) {
    result = result.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, (match) => {
      const localPart = match.split("@")[0] || "";
      const pseudo = `[EMAIL-${localPart.slice(0, 3)}]`;
      pseudonymMap[pseudo] = match;
      return pseudo;
    });
  }

  return { redactedText: result, pseudonymMap };
}

export function unredactText(text: string, pseudonymMap: Record<string, string>): string {
  let result = text;
  for (const [pseudonym, original] of Object.entries(pseudonymMap)) {
    const regex = new RegExp(escapeRegex(pseudonym), "g");
    result = result.replace(regex, original);
  }
  return result;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
