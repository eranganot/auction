import type { UserFilter } from '@bidspirit/database';
import type { FilterCriteria } from './types';

/** Convert a persisted UserFilter row into the pure FilterCriteria DTO. */
export function toFilterCriteria(f: UserFilter): FilterCriteria {
  return {
    minModelYear: f.minModelYear ?? null,
    minDateOnRoad: f.minDateOnRoad ?? null,
    maxMileage: f.maxMileage ?? null,
    maxHand: f.maxHand ?? null,
    maxPrice: f.maxPrice ?? null,
    transmission: f.transmission ?? [],
    ownership: f.ownership ?? [],
  };
}
