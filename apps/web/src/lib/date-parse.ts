import * as chrono from "chrono-node";

/**
 * H1 — Smart natural-language date parser (frontend mirror).
 */
export interface ParsedSmartDate {
  date: Date | null;
  confidence: "high" | "medium" | "low";
  interpreted: string | null;
  iso: string | null;
}

export function parseSmartDate(
  input: string,
  referenceDate: Date = new Date(),
): ParsedSmartDate {
  if (!input || !input.trim()) {
    return { date: null, confidence: "low", interpreted: null, iso: null };
  }
  const results = chrono.parse(input, referenceDate);
  const result = results[0];
  if (!result) {
    return { date: null, confidence: "low", interpreted: null, iso: null };
  }
  const date = result.start.date();
  const confidence = result.start.isCertain("year") ? "high" : "medium";
  return {
    date,
    confidence,
    interpreted: formatDateFriendly(date),
    iso: toISODate(date),
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

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
