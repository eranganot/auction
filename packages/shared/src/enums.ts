import { Ownership, Transmission } from '@bidspirit/database';
import { cleanString } from './normalize';

/**
 * Defensive Hebrew → internal-enum mapping. Source strings are cleaned
 * (whitespace + RTL/hidden control chars stripped) before prefix matching,
 * and anything unrecognized falls back to UNKNOWN so ingestion never crashes.
 *
 * Prefix matching (startsWith) tolerates gender/number variants and trailing
 * descriptors, e.g. "אוטומטית", "אוטומט-רובוטי".
 */

interface EnumRule<T> {
  prefixes: string[];
  value: T;
}

function mapByPrefix<T>(raw: unknown, rules: EnumRule<T>[], fallback: T): T {
  const s = cleanString(raw);
  if (!s) return fallback;
  for (const rule of rules) {
    for (const p of rule.prefixes) {
      if (s.startsWith(p)) return rule.value;
    }
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// Transmission (תיבת הילוכים)
// ---------------------------------------------------------------------------
const TRANSMISSION_RULES: EnumRule<Transmission>[] = [
  // Robotic must be checked before automatic because some sources write
  // "אוטומט-רובוטי"; but we also catch the explicit "רובוטי".
  { prefixes: ['רובוטי', 'אוטומט-רובוטי', 'אוטומטית-רובוטית'], value: Transmission.ROBOTIC },
  { prefixes: ['אוטומט', 'אוטומטי', 'אוטומטית'], value: Transmission.AUTOMATIC },
  { prefixes: ['ידני', 'ידנית'], value: Transmission.MANUAL },
];

export function mapTransmission(raw: unknown): Transmission {
  // Special-case the robotic compound before generic automatic prefix.
  const s = cleanString(raw);
  if (s.includes('רובוטי')) return Transmission.ROBOTIC;
  return mapByPrefix(raw, TRANSMISSION_RULES, Transmission.UNKNOWN);
}

// ---------------------------------------------------------------------------
// Ownership (בעלות) — note source uses masculine "פרטי", not "פרטית"
// ---------------------------------------------------------------------------
const OWNERSHIP_RULES: EnumRule<Ownership>[] = [
  { prefixes: ['פרטי', 'פרטית'], value: Ownership.PRIVATE },
  { prefixes: ['חברה', 'חברת'], value: Ownership.COMPANY },
  { prefixes: ['ליסינג'], value: Ownership.LEASING },
  { prefixes: ['השכרה', 'השכרת'], value: Ownership.RENTAL },
  { prefixes: ['ממשלתי', 'ממשלה', 'מדינה'], value: Ownership.GOV },
];

export function mapOwnership(raw: unknown): Ownership {
  return mapByPrefix(raw, OWNERSHIP_RULES, Ownership.UNKNOWN);
}

// ---------------------------------------------------------------------------
// Hand (יד) — Hebrew ORDINAL WORDS, not digits
// ---------------------------------------------------------------------------
const HAND_WORDS: Record<string, number> = {
  ראשונה: 1,
  ראשון: 1,
  שנייה: 2,
  שניה: 2,
  שני: 2,
  שלישית: 3,
  שלישי: 3,
  רביעית: 4,
  רביעי: 4,
  חמישית: 5,
  חמישי: 5,
  שישית: 6,
  שישי: 6,
  שביעית: 7,
  שמינית: 8,
};

/**
 * Map a Hebrew ordinal hand word → int. Also tolerates a bare digit
 * ("2", "יד 2"). Returns null when absent/unknown.
 */
export function mapHand(raw: unknown): number | null {
  const s = cleanString(raw);
  if (!s) return null;

  // direct ordinal word
  if (s in HAND_WORDS) return HAND_WORDS[s]!;

  // word appearing inside a longer string (e.g. "יד שנייה")
  for (const [word, n] of Object.entries(HAND_WORDS)) {
    if (s.includes(word)) return n;
  }

  // fallback: a bare digit
  const digits = s.replace(/[^\d]/g, '');
  if (digits) {
    const n = Number.parseInt(digits, 10);
    if (Number.isFinite(n) && n > 0 && n < 20) return n;
  }
  return null;
}

const TRANSMISSION_LABELS_HE: Record<Transmission, string> = {
  [Transmission.AUTOMATIC]: 'אוטומטי',
  [Transmission.MANUAL]: 'ידני',
  [Transmission.ROBOTIC]: 'רובוטי',
  [Transmission.UNKNOWN]: 'לא ידוע',
};

const OWNERSHIP_LABELS_HE: Record<Ownership, string> = {
  [Ownership.PRIVATE]: 'פרטי',
  [Ownership.COMPANY]: 'חברה',
  [Ownership.LEASING]: 'ליסינג',
  [Ownership.RENTAL]: 'השכרה',
  [Ownership.GOV]: 'ממשלתי',
  [Ownership.UNKNOWN]: 'לא ידוע',
};

/** Human-facing Hebrew label for an internal enum (used in UI + notifications). */
export function transmissionLabelHe(t: Transmission): string {
  return TRANSMISSION_LABELS_HE[t] ?? 'לא ידוע';
}

export function ownershipLabelHe(o: Ownership): string {
  return OWNERSHIP_LABELS_HE[o] ?? 'לא ידוע';
}
