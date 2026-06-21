import { buildWebPushPayload } from './format';
import type { DigestPayload, NotifiableCar } from './types';

function car(makeModel: string, modelYear: number | null, lotUrl: string): NotifiableCar {
  return {
    makeModel,
    modelYear,
    mileage: 50000,
    hand: 1,
    transmission: 'AUTOMATIC',
    ownership: 'PRIVATE',
    openingPrice: null,
    tariffPrice: null,
    lotUrl,
  };
}

function digest(over: Partial<DigestPayload> = {}): DigestPayload {
  return { added: [], removed: [], totalMatches: 0, ...over };
}

describe('buildWebPushPayload', () => {
  it('reports a single new car by name and deep-links to it', () => {
    const p = buildWebPushPayload(
      digest({ added: [car('טויוטה קורולה', 2024, 'https://x/1')], totalMatches: 1 }),
    );
    expect(p.title).toContain('רכב חדש');
    expect(p.body).toBe('טויוטה קורולה (2024)');
    expect(p.url).toBe('https://x/1');
  });

  it('states the count and lists which cars were added', () => {
    const p = buildWebPushPayload(
      digest({
        added: [
          car('טויוטה קורולה', 2024, 'https://x/1'),
          car('מאזדה 3', 2019, 'https://x/2'),
          car('יונדאי i20', null, 'https://x/3'),
        ],
        totalMatches: 12,
      }),
    );
    expect(p.title).toContain('3');
    expect(p.body).toBe('טויוטה קורולה (2024), מאזדה 3 (2019), יונדאי i20');
    // Multiple new cars → open the list, not a single lot.
    expect(p.url).toBe('/');
  });

  it('caps the list and summarises the remainder', () => {
    const added = Array.from({ length: 11 }, (_, i) => car(`רכב ${i + 1}`, 2020, `https://x/${i}`));
    const p = buildWebPushPayload(digest({ added, totalMatches: 11 }));
    expect(p.title).toContain('11');
    expect(p.body).toContain('ועוד 3'); // 11 - 8 shown = 3 more
  });

  it('falls back to a removed summary when nothing new was added', () => {
    const p = buildWebPushPayload(
      digest({ removed: [{ makeModel: 'קיה', lotUrl: 'https://x/9' }], totalMatches: 5 }),
    );
    expect(p.title).toContain('שינויים');
    expect(p.body).toContain('הוסרו');
    expect(p.url).toBe('/');
  });
});
