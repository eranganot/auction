import type { CarWithAuction } from '@bidspirit/database';
import { parseSort, sortCars, SORTABLE_FIELDS } from '../src/sort';

function car(over: Partial<CarWithAuction>): CarWithAuction {
  return {
    id: 1,
    lotId: '1',
    lotUrl: 'u',
    makeModel: 'a',
    modelYear: 2020,
    dateOnRoad: null,
    mileage: 1000,
    transmission: 'AUTOMATIC',
    hand: 1,
    ownership: 'UNKNOWN',
    tariffPrice: null,
    openingPrice: null,
    imageUrl: null,
    lastPrice: null,
    lastStatus: null,
    firstSeenAt: new Date(),
    lastSeenAt: new Date(),
    notificationSentAt: null,
    auctionId: 1,
    auction: { externalId: 'a', title: 't', status: 'READY' },
    ...over,
  } as CarWithAuction;
}

describe('parseSort', () => {
  it('parses valid field:dir pairs', () => {
    expect(parseSort('modelYear:desc,openingPrice:asc')).toEqual([
      { field: 'modelYear', dir: 'desc' },
      { field: 'openingPrice', dir: 'asc' },
    ]);
  });
  it('defaults unknown direction to asc and ignores unknown fields', () => {
    expect(parseSort('modelYear:weird,hacker:desc')).toEqual([{ field: 'modelYear', dir: 'asc' }]);
  });
  it('returns [] for empty / non-string', () => {
    expect(parseSort('')).toEqual([]);
    expect(parseSort(undefined)).toEqual([]);
  });
  it('whitelist covers expected columns', () => {
    expect(SORTABLE_FIELDS).toContain('openingPrice');
    expect(SORTABLE_FIELDS).not.toContain('id');
  });
});

describe('sortCars', () => {
  it('sorts numbers ascending and descending', () => {
    const cars = [
      car({ id: 1, mileage: 30 }),
      car({ id: 2, mileage: 10 }),
      car({ id: 3, mileage: 20 }),
    ];
    expect(sortCars(cars, [{ field: 'mileage', dir: 'asc' }]).map((c) => c.id)).toEqual([2, 3, 1]);
    expect(sortCars(cars, [{ field: 'mileage', dir: 'desc' }]).map((c) => c.id)).toEqual([1, 3, 2]);
  });
  it('keeps nulls last regardless of direction', () => {
    const cars = [car({ id: 1, openingPrice: null }), car({ id: 2, openingPrice: 5000 })];
    expect(sortCars(cars, [{ field: 'openingPrice', dir: 'asc' }]).map((c) => c.id)).toEqual([
      2, 1,
    ]);
    expect(sortCars(cars, [{ field: 'openingPrice', dir: 'desc' }]).map((c) => c.id)).toEqual([
      2, 1,
    ]);
  });
  it('applies multi-column tie-breaking', () => {
    const cars = [
      car({ id: 1, modelYear: 2022, mileage: 50 }),
      car({ id: 2, modelYear: 2022, mileage: 10 }),
      car({ id: 3, modelYear: 2023, mileage: 99 }),
    ];
    const out = sortCars(cars, [
      { field: 'modelYear', dir: 'desc' },
      { field: 'mileage', dir: 'asc' },
    ]).map((c) => c.id);
    expect(out).toEqual([3, 2, 1]);
  });
});
