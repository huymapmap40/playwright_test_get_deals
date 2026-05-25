/**
 * Parse a price-like string into a number. Strips currency symbols,
 * thousands separators, and surrounding whitespace.
 *
 * Returns null when the input is not parseable.
 */
export function parsePrice(value: string): number | null {
  const cleaned = value.replace(/[^\d.,-]/g, '').replace(/,/g, '');
  if (cleaned.length === 0) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function randomInt(min: number, maxInclusive: number): number {
  const lo = Math.ceil(min);
  const hi = Math.floor(maxInclusive);
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

export function formatPercent(ratio: number, fractionDigits = 0): string {
  return `${(ratio * 100).toFixed(fractionDigits)}%`;
}
