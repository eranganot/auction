import {
  buildMakeModel,
  cleanString,
  parseDate,
  parseMileage,
  parsePrice,
  parseYear,
} from './normalize';

describe('cleanString', () => {
  it('returns empty string for null/undefined', () => {
    expect(cleanString(null)).toBe('');
    expect(cleanString(undefined)).toBe('');
  });
  it('strips RTL/LTR marks and bidi controls', () => {
    expect(cleanString('‏טויוטה‎')).toBe('טויוטה');
    expect(cleanString('‫test‬')).toBe('test');
    expect(cleanString('⁦abc⁩')).toBe('abc');
  });
  it('strips ZWSP and BOM', () => {
    expect(cleanString('﻿x​y')).toBe('xy');
  });
  it('converts NBSP to a regular space and trims', () => {
    expect(cleanString('  a b  ')).toBe('a b');
  });
  it('coerces numbers to strings', () => {
    expect(cleanString(2023)).toBe('2023');
  });
});

describe('parseMileage', () => {
  it('parses comma-formatted strings', () => {
    expect(parseMileage('27,373')).toBe(27373);
  });
  it('strips Hebrew km suffix', () => {
    expect(parseMileage('27373 ק"מ')).toBe(27373);
  });
  it('handles RTL-marked strings', () => {
    expect(parseMileage('‏27373')).toBe(27373);
  });
  it('truncates numeric input', () => {
    expect(parseMileage(50000.9)).toBe(50000);
  });
  it('returns null for empty / non-numeric', () => {
    expect(parseMileage('')).toBeNull();
    expect(parseMileage('לא ידוע')).toBeNull();
    expect(parseMileage(null)).toBeNull();
  });
});

describe('parsePrice', () => {
  it('strips shekel sign, commas, spaces', () => {
    expect(parsePrice('₪ 120,000')).toBe(120000);
  });
  it('treats 0 as a real value', () => {
    expect(parsePrice(0)).toBe(0);
    expect(parsePrice('0')).toBe(0);
  });
  it('returns null for empty', () => {
    expect(parsePrice('')).toBeNull();
    expect(parsePrice(undefined)).toBeNull();
  });
});

describe('parseYear', () => {
  it('accepts a valid year', () => {
    expect(parseYear('2023')).toBe(2023);
    expect(parseYear(2023)).toBe(2023);
  });
  it('rejects years outside the sanity window', () => {
    expect(parseYear('1899')).toBeNull();
    expect(parseYear('2101')).toBeNull();
  });
  it('returns null for empty/garbage', () => {
    expect(parseYear('')).toBeNull();
    expect(parseYear('abc')).toBeNull();
  });
});

describe('parseDate', () => {
  it('parses ISO yyyy-mm-dd as UTC midnight', () => {
    const d = parseDate('2023-03-15')!;
    expect(d.toISOString()).toBe('2023-03-15T00:00:00.000Z');
  });
  it('parses dd/mm/yyyy', () => {
    expect(parseDate('15/03/2023')!.toISOString()).toBe('2023-03-15T00:00:00.000Z');
  });
  it('parses dd.mm.yyyy and dd-mm-yyyy', () => {
    expect(parseDate('15.03.2023')!.toISOString()).toBe('2023-03-15T00:00:00.000Z');
    expect(parseDate('15-03-2023')!.toISOString()).toBe('2023-03-15T00:00:00.000Z');
  });
  it('parses mm/yyyy with day defaulting to 1', () => {
    expect(parseDate('03/2023')!.toISOString()).toBe('2023-03-01T00:00:00.000Z');
  });
  it('parses bare yyyy', () => {
    expect(parseDate('2023')!.toISOString()).toBe('2023-01-01T00:00:00.000Z');
  });
  it('rejects impossible month/day', () => {
    expect(parseDate('15/13/2023')).toBeNull();
    expect(parseDate('32/01/2023')).toBeNull();
  });
  it('returns null on empty/garbage', () => {
    expect(parseDate('')).toBeNull();
    expect(parseDate('not a date')).toBeNull();
  });
});

describe('buildMakeModel', () => {
  it('joins manufacturer and model', () => {
    expect(buildMakeModel('טויוטה', 'קורולה')).toBe('טויוטה קורולה');
  });
  it('drops empty parts', () => {
    expect(buildMakeModel('טויוטה', '')).toBe('טויוטה');
    expect(buildMakeModel('', 'קורולה')).toBe('קורולה');
    expect(buildMakeModel(null, null)).toBe('');
  });
  it('cleans hidden chars in parts', () => {
    expect(buildMakeModel('‏טויוטה', 'קורולה‎')).toBe('טויוטה קורולה');
  });
});
