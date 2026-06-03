import { Ownership, Transmission } from '@bidspirit/database';
import type { UserFilter } from '@bidspirit/database';
import { toFilterCriteria } from './filter';

function userFilter(overrides: Partial<UserFilter> = {}): UserFilter {
  return {
    id: 1,
    minModelYear: 2022,
    minDateOnRoad: new Date(Date.UTC(2022, 0, 1)),
    maxMileage: 100_000,
    maxHand: 3,
    maxPrice: null,
    transmission: [Transmission.AUTOMATIC],
    ownership: [Ownership.PRIVATE],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as UserFilter;
}

describe('toFilterCriteria', () => {
  it('maps a populated UserFilter row', () => {
    const c = toFilterCriteria(userFilter());
    expect(c.minModelYear).toBe(2022);
    expect(c.maxMileage).toBe(100_000);
    expect(c.maxHand).toBe(3);
    expect(c.maxPrice).toBeNull();
    expect(c.transmission).toEqual([Transmission.AUTOMATIC]);
    expect(c.ownership).toEqual([Ownership.PRIVATE]);
  });

  it('coerces null/undefined scalars and arrays to no-constraint defaults', () => {
    const c = toFilterCriteria(
      userFilter({
        minModelYear: null,
        minDateOnRoad: null,
        maxMileage: null,
        maxHand: null,
        maxPrice: null,
        transmission: [],
        ownership: [],
      }),
    );
    expect(c.minModelYear).toBeNull();
    expect(c.minDateOnRoad).toBeNull();
    expect(c.maxMileage).toBeNull();
    expect(c.maxHand).toBeNull();
    expect(c.transmission).toEqual([]);
    expect(c.ownership).toEqual([]);
  });
});
