/**
 * Trim a string and collapse internal whitespace into single spaces.
 */
export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function isBlank(value: string | null | undefined): boolean {
  return value == null || value.trim().length === 0;
}

export function isNotBlank(value: string | null | undefined): value is string {
  return !isBlank(value);
}

/**
 * Mask everything except the first and last characters of an email's local part.
 * Useful for log lines so test credentials don't leak in CI output.
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
}

export function randomString(length = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}
