/**
 * Input masks and validation regex patterns — reusable across forms.
 */

// ─── RFC Validation ──────────────────────────────────────────────────

/** RFC persona moral: 3 letters + 6 digits + 3 alphanumeric = 12 chars */
export const RFC_3_REGEX = /^[A-Z]{3}[0-9]{6}[A-Z0-9]{3}$/;  // companies

/** RFC persona física: 4 letters + 6 digits + 3 alphanumeric = 13 chars */
export const RFC_4_REGEX = /^[A-Z]{4}[0-9]{6}[A-Z0-9]{3}$/;  // individuals

/** Email basic format */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── RFC Mask ────────────────────────────────────────────────────────

/**
 * Positional RFC mask based on the pattern:
 *   Pos 1-4:  letters only (A-Z)
 *   Pos 5-10: digits only (0-9)
 *   Pos 11-13: alphanumeric (A-Z, 0-9)
 *
 * If a letter appears at pos 4 → persona física (13 chars).
 * If a digit appears at pos 4 → persona moral (12 chars), date block starts.
 */
export function maskRfc(raw: string): string {
  // Strip everything that isn't A-Z or 0-9 before processing
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  let result = '';

  for (let i = 0; i < clean.length && result.length < 13; i++) {
    const ch = clean[i] ?? '';
    const pos = result.length;

    if (pos <= 2) {
      if (/[A-Z]/.test(ch)) result += ch;
      continue;
    }

    if (pos === 3) {
      if (/[A-Z0-9]/.test(ch)) result += ch;
      continue;
    }

    const isMoral = /[0-9]/.test(result[3] ?? '');
    const dateStart = isMoral ? 3 : 4;
    const dateEnd = dateStart + 5;
    const suffixStart = dateEnd + 1;

    if (pos >= dateStart && pos <= dateEnd) {
      if (/[0-9]/.test(ch)) result += ch;
      continue;
    }

    if (pos >= suffixStart && pos < suffixStart + 3) {
      if (/[A-Z0-9]/.test(ch)) result += ch;
      continue;
    }
  }

  return result;
}

// ─── Phone Mask ──────────────────────────────────────────────────────

/**
 * Phone mask: "55 1234 5678" — digits only, spaces at pos 2 and 6.
 * Max 10 digits (12 chars with spaces).
 */
export function maskPhone(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '').slice(0, 10);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6)}`;
}

// ─── CLABE Mask ──────────────────────────────────────────────────────

/** CLABE format: NNN-NNN-NNNNNNNNNNN-N (18 digits with dashes) */
export const CLABE_REGEX = /^\d{3}-\d{3}-\d{11}-\d{1}$/;

/**
 * CLABE mask: "012-345-67890123456-7" — digits only, dashes at pos 3, 6, 17.
 * Max 18 digits (21 chars with dashes).
 */
export function maskClabe(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '').slice(0, 18);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length <= 17) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 17)}-${digits.slice(17)}`;
}
