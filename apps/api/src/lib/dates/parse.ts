import * as chrono from "chrono-node";

/**
 * H1 — Smart natural-language date parser.
 * Accepts ISO strings, "next Monday", "tomorrow", etc.
 */
export interface ParsedSmartDate {
  date: Date | null;
  confidence: "high" | "medium" | "low";
  interpreted: string | null;
}

export function parseSmartDate(
  input: string,
  referenceDate: Date = new Date(),
): ParsedSmartDate {
  if (!input || !input.trim()) {
    return { date: null, confidence: "low", interpreted: null };
  }
  const results = chrono.parse(input, referenceDate);
  const result = results[0];
  if (!result) return { date: null, confidence: "low", interpreted: null };
  const date = result.start.date();
  const confidence = result.start.isCertain("year") ? "high" : "medium";
  return {
    date,
    confidence,
    interpreted: formatDateFriendly(date),
  };
}

function formatDateFriendly(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
