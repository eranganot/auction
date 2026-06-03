import { Ownership, Transmission } from '@bidspirit/database';
import { effectivePrice, matches, type MatchableCar } from './matching';
import type { FilterCriteria } from './types';

function car(overrides: Partial<MatchableCar> = {}): MatchableCar {
  return {
    modelYear: 2023,
    dateOnRoad: new Date(Date.UTC(2023, 0, 1)),
    mileage: 50_000,
    transmission: Transmission.AUTOMATIC,
    hand: 1,
    ownership: Ownership.PRIVATE,
    tariffPrice: 120_000,
    openingPrice: 90_000,
    ...overrides,
  };
}

function filter(overrides: Partial<FilterCriteria> = {}): FilterCriteria {
  return {
    minModelYear: null,
    minDateOnRoad: null,
    maxMileage: null,
    maxHand: null,
    maxPrice: null,
    transmission: [],
    ownership: [],
    ...overrides,
  };
}

function reasonFor(result: ReturnType<typeof matches>, criterion: string) {
  return result.reasons.find((r) => r.criterion === criterion);
}

describe('effectivePrice', () => {
  it('prefers a positive opening price', () => {
    expect(effectivePrice(car({ openingPrice: 80_000, tariffPrice: 120_000 }))).toBe(80_000);
  });

  it('falls back to tariff when opening is null', () => {
    expect(effectivePrice(car({ openingPrice: null, tariffPrice: 120_000 }))).toBe(120_000);
  });

  it('falls back to tariff when opening is 0', () => {
    expect(effectivePrice(car({ openingPrice: 0, tariffPrice: 120_000 }))).toBe(120_000);
  });

  it('returns null when both are null/zero', () => {
    expect(effectivePrice(car({ openingPrice: 0, tariffPrice: 0 }))).toBeNull();
    expect(effectivePrice(car({ openingPrice: null, tariffPrice: null }))).toBeNull();
  });
});

describe('matches — empty filter', () => {
  it('matches anything with no constraints', () => {
    const res = matches(car(), filter());
    expect(res.matched).toBe(true);
    expect(res.reasons).toHaveLength(0);
  });
});

describe('matches — minModelYear', () => {
  it('passes at the boundary', () => {
    expect(matches(car({ modelYear: 2022 }), filter({ minModelYear: 2022 })).matched).toBe(true);
  });
  it('fails below the boundary', () => {
    const res = matches(car({ modelYear: 2021 }), filter({ minModelYear: 2022 }));
    expect(res.matched).toBe(false);
    expect(reasonFor(res, 'minModelYear')?.passed).toBe(false);
  });
  it('null model year does NOT fail', () => {
    const res = matches(car({ modelYear: null }), filter({ minModelYear: 2022 }));
    expect(res.matched).toBe(true);
    expect(reasonFor(res, 'minModelYear')?.passed).toBe(true);
  });
});

describe('matches — minDateOnRoad', () => {
  const min = new Date(Date.UTC(2022, 0, 1));
  it('passes at the boundary', () => {
    expect(matches(car({ dateOnRoad: min }), filter({ minDateOnRoad: min })).matched).toBe(true);
  });
  it('fails before the boundary', () => {
    const res = matches(
      car({ dateOnRoad: new Date(Date.UTC(2021, 11, 31)) }),
      filter({ minDateOnRoad: min }),
    );
    expect(res.matched).toBe(false);
  });
  it('null date does NOT fail', () => {
    const res = matches(car({ dateOnRoad: null }), filter({ minDateOnRoad: min }));
    expect(res.matched).toBe(true);
    expect(reasonFor(res, 'minDateOnRoad')?.passed).toBe(true);
  });
});

describe('matches — maxMileage', () => {
  it('passes at the boundary', () => {
    expect(matches(car({ mileage: 100_000 }), filter({ maxMileage: 100_000 })).matched).toBe(true);
  });
  it('fails above the boundary', () => {
    expect(matches(car({ mileage: 100_001 }), filter({ maxMileage: 100_000 })).matched).toBe(false);
  });
  it('null mileage does NOT fail', () => {
    expect(matches(car({ mileage: null }), filter({ maxMileage: 100_000 })).matched).toBe(true);
  });
});

describe('matches — maxHand', () => {
  it('passes at the boundary', () => {
    expect(matches(car({ hand: 3 }), filter({ maxHand: 3 })).matched).toBe(true);
  });
  it('fails above the boundary', () => {
    expect(matches(car({ hand: 4 }), filter({ maxHand: 3 })).matched).toBe(false);
  });
  it('null hand does NOT fail', () => {
    expect(matches(car({ hand: null }), filter({ maxHand: 3 })).matched).toBe(true);
  });
});

describe('matches — transmission (any-of)', () => {
  it('passes when included', () => {
    const res = matches(
      car({ transmission: Transmission.AUTOMATIC }),
      filter({ transmission: [Transmission.AUTOMATIC] }),
    );
    expect(res.matched).toBe(true);
  });
  it('fails when not included', () => {
    const res = matches(
      car({ transmission: Transmission.MANUAL }),
      filter({ transmission: [Transmission.AUTOMATIC] }),
    );
    expect(res.matched).toBe(false);
  });
  it('empty array = no constraint (UNKNOWN still passes)', () => {
    const res = matches(car({ transmission: Transmission.UNKNOWN }), filter({ transmission: [] }));
    expect(res.matched).toBe(true);
    expect(reasonFor(res, 'transmission')).toBeUndefined();
  });
});

describe('matches — ownership (any-of)', () => {
  it('passes when included', () => {
    const res = matches(
      car({ ownership: Ownership.PRIVATE }),
      filter({ ownership: [Ownership.PRIVATE, Ownership.COMPANY] }),
    );
    expect(res.matched).toBe(true);
  });
  it('fails when not included', () => {
    const res = matches(
      car({ ownership: Ownership.LEASING }),
      filter({ ownership: [Ownership.PRIVATE] }),
    );
    expect(res.matched).toBe(false);
  });
});

describe('matches — maxPrice (CRITICAL null rule)', () => {
  it('passes at the boundary using opening price', () => {
    const res = matches(
      car({ openingPrice: 100_000, tariffPrice: 999_999 }),
      filter({ maxPrice: 100_000 }),
    );
    expect(res.matched).toBe(true);
  });
  it('fails above the boundary', () => {
    const res = matches(
      car({ openingPrice: 100_001, tariffPrice: null }),
      filter({ maxPrice: 100_000 }),
    );
    expect(res.matched).toBe(false);
  });
  it('null/zero price does NOT fail (most pre-live lots)', () => {
    const res = matches(car({ openingPrice: 0, tariffPrice: null }), filter({ maxPrice: 50_000 }));
    expect(res.matched).toBe(true);
    expect(reasonFor(res, 'maxPrice')?.passed).toBe(true);
  });
});

describe('matches — multi-criteria combinations', () => {
  const seed = filter({
    minModelYear: 2022,
    maxMileage: 100_000,
    maxHand: 3,
    transmission: [Transmission.AUTOMATIC],
  });

  it('all pass → matched', () => {
    expect(matches(car(), seed).matched).toBe(true);
  });

  it('one fails → not matched, others still recorded', () => {
    const res = matches(car({ mileage: 200_000 }), seed);
    expect(res.matched).toBe(false);
    expect(reasonFor(res, 'minModelYear')?.passed).toBe(true);
    expect(reasonFor(res, 'maxMileage')?.passed).toBe(false);
    expect(res.reasons).toHaveLength(4);
  });

  it('mixed nulls on constrained fields still pass with seed', () => {
    const res = matches(car({ modelYear: null, mileage: null, hand: null }), seed);
    expect(res.matched).toBe(true);
  });
});
