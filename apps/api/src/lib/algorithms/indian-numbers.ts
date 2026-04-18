/**
 * H2 — Indian number formatting.
 *
 * Standard mode: uses Indian grouping (4,82,000).
 * Compact mode: 1.25L, 1.20Cr for large values.
 */
export function formatIndianNumber(n: number, compact = false): string {
  if (!Number.isFinite(n)) return "0";
  const negative = n < 0;
  const abs = Math.abs(n);
  let result: string;

  if (compact) {
    if (abs >= 10000000) result = `${(abs / 10000000).toFixed(2)}Cr`;
    else if (abs >= 100000) result = `${(abs / 100000).toFixed(2)}L`;
    else if (abs >= 1000) result = `${(abs / 1000).toFixed(1)}k`;
    else result = abs % 1 === 0 ? abs.toString() : abs.toFixed(2);
  } else {
    result = new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 2,
    }).format(abs);
  }

  return negative ? `-${result}` : result;
}

export function formatIndianCurrency(n: number, compact = false): string {
  if (!Number.isFinite(n)) return "₹0";
  const negative = n < 0;
  const prefix = negative ? "-₹" : "₹";
  const abs = Math.abs(n);
  return `${prefix}${formatIndianNumber(abs, compact)}`;
}
