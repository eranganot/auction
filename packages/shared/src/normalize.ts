/**
 * Defensive value normalization. Every parser returns null on malformed/empty
 * input rather than throwing, so a single bad field can never crash ingestion.
 */

/** Strip RTL marks, bidi controls, NBSP, and trim. */
export function cleanString(input: unknown): string {
  if (input === null || input === undefined) return '';
  return (
    String(input)
      // RTL/LTR marks, bidi embeddings/overrides, isolates, ZWSP, BOM
      .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069\u200B\uFEFF]/g, '')
      .replace(/\u00A0/g, ' ')
      .trim()
  );
}

/** Extract the first run of digits and return as Int, else null. */
function digitsToInt(input: unknown): number | null {
  const s = cleanString(input);
  if (!s) return null;
  const digits = s.replace(/[^\d]/g, '');
  if (!digits) return null;
  const n = Number.parseInt(digits, 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Mileage → Int. Handles values already numeric, and strings like
 * "27,373", "27373 ק\"מ", "‏27373". Returns null when absent/unparseable.
 */
export function parseMileage(input: unknown): number | null {
  if (typeof input === 'number') return Number.isFinite(input) ? Math.trunc(input) : null;
  return digitsToInt(input);
}

/**
 * Price → Int. Strips ₪, commas, spaces. 0 is treated as a real value (caller
 * decides whether 0 means "unknown"). Returns null when absent/unparseable.
 */
export function parsePrice(input: unknown): number | null {
  if (typeof input === 'number') return Number.isFinite(input) ? Math.trunc(input) : null;
  return digitsToInt(input);
}

/** Model year → Int with a sanity window. */
export function parseYear(input: unknown): number | null {
  if (typeof input === 'number' && Number.isFinite(input)) return Math.trunc(input);
  const n = digitsToInt(input);
  if (n === null) return null;
  return n >= 1900 && n <= 2100 ? n : null;
}

/**
 * Date → Date (UTC, midnight). Handles:
 *   - dd/mm/yyyy or dd.mm.yyyy or dd-mm-yyyy
 *   - mm/yyyy (day defaults to 1)
 *   - yyyy-mm-dd (ISO)
 *   - yyyy (year only)
 * Returns null on empty/unparseable input.
 */
export function parseDate(input: unknown): Date | null {
  const s = cleanString(input);
  if (!s) return null;

  // ISO-ish yyyy-mm-dd
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (iso) return makeUtc(+iso[1]!, +iso[2]!, +iso[3]!);

  // dd[/.-]mm[/.-]yyyy
  const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s);
  if (dmy) return makeUtc(+dmy[3]!, +dmy[2]!, +dmy[1]!);

  // mm[/.-]yyyy
  const my = /^(\d{1,2})[/.-](\d{4})$/.exec(s);
  if (my) return makeUtc(+my[2]!, +my[1]!, 1);

  // yyyy only
  const y = /^(\d{4})$/.exec(s);
  if (y) return makeUtc(+y[1]!, 1, 1);

  return null;
}

function makeUtc(year: number, month: number, day: number): Date | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Concatenate manufacturer + model into a single makeModel string. */
export function buildMakeModel(manufacturer: unknown, model: unknown): string {
  const parts = [cleanString(manufacturer), cleanString(model)].filter(Boolean);
  return parts.join(' ').trim();
}
