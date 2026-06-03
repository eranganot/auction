import type { CarWithAuction } from '@bidspirit/database';

export type SortDir = 'asc' | 'desc';
export interface SortKey {
  field: SortableField;
  dir: SortDir;
}

/** Whitelisted sortable fields (prevents arbitrary property access). */
export const SORTABLE_FIELDS = [
  'makeModel',
  'modelYear',
  'dateOnRoad',
  'mileage',
  'hand',
  'openingPrice',
  'tariffPrice',
  'firstSeenAt',
  'lastSeenAt',
] as const;
export type SortableField = (typeof SORTABLE_FIELDS)[number];

function isSortable(f: string): f is SortableField {
  return (SORTABLE_FIELDS as readonly string[]).includes(f);
}

/**
 * Parse a `?sort=field:dir,field2:dir2` string into validated sort keys.
 * Unknown fields are ignored. Invalid/empty input yields [].
 */
export function parseSort(raw: unknown): SortKey[] {
  if (typeof raw !== 'string' || !raw.trim()) return [];
  const keys: SortKey[] = [];
  for (const part of raw.split(',')) {
    const [field, dirRaw] = part.split(':').map((s) => s.trim());
    if (!field || !isSortable(field)) continue;
    const dir: SortDir = dirRaw === 'desc' ? 'desc' : 'asc';
    keys.push({ field, dir });
  }
  return keys;
}

function isNil(v: unknown): boolean {
  return v === null || v === undefined;
}

/** Compare two non-null values. */
function cmpValue(a: unknown, b: unknown): number {
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'he');
}

/**
 * Stable multi-column sort. Returns a new array. Null/undefined values always
 * sort LAST, independent of asc/desc direction.
 */
export function sortCars(cars: CarWithAuction[], keys: SortKey[]): CarWithAuction[] {
  if (keys.length === 0) return cars;
  return [...cars].sort((x, y) => {
    for (const k of keys) {
      const a = (x as unknown as Record<string, unknown>)[k.field];
      const b = (y as unknown as Record<string, unknown>)[k.field];
      const an = isNil(a);
      const bn = isNil(b);
      if (an && bn) continue;
      if (an) return 1; // nulls last
      if (bn) return -1;
      const base = cmpValue(a, b);
      if (base !== 0) return k.dir === 'desc' ? -base : base;
    }
    return 0;
  });
}
