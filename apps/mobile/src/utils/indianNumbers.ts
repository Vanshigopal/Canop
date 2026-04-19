// Format numbers in the Indian numbering system (1,00,000 not 100,000).
// Mirrors apps/web/src/lib/indian-numbers.ts.

export function formatIndianNumber(value: number): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '0';
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(Math.round(value));
  const str = abs.toString();

  if (str.length <= 3) return sign + str;

  const lastThree = str.slice(-3);
  const rest = str.slice(0, -3);
  const formatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  return sign + formatted;
}

export function formatIndianCurrency(
  value: number,
  options: { withSymbol?: boolean } = { withSymbol: true },
): string {
  const formatted = formatIndianNumber(value);
  return options.withSymbol ? `\u20B9${formatted}` : formatted;
}

export function formatCompactIndian(value: number): string {
  if (value < 1000) return value.toString();
  if (value < 100000) return `${(value / 1000).toFixed(1)}K`;
  if (value < 10000000) return `${(value / 100000).toFixed(1)}L`;
  return `${(value / 10000000).toFixed(2)}Cr`;
}
