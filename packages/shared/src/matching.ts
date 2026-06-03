import type { Ownership, Transmission } from '@bidspirit/database';
import type { CriterionResult, FilterCriteria, MatchResult } from './types';

/**
 * The subset of car fields the matching engine reads. Both a NormalizedCar and
 * a persisted Prisma Car structurally satisfy this, so matching works on either.
 */
export interface MatchableCar {
  modelYear: number | null;
  dateOnRoad: Date | null;
  mileage: number | null;
  transmission: Transmission;
  hand: number | null;
  ownership: Ownership;
  tariffPrice: number | null;
  openingPrice: number | null;
}

/** Effective price for matching: opening price preferred, tariff as fallback. */
export function effectivePrice(car: MatchableCar): number | null {
  if (car.openingPrice != null && car.openingPrice > 0) return car.openingPrice;
  if (car.tariffPrice != null && car.tariffPrice > 0) return car.tariffPrice;
  return null;
}

/**
 * Pure matching function. Each criterion is evaluated independently and a
 * per-criterion reason is recorded for transparency + unit testing. No DB, no
 * side effects.
 *
 * CRITICAL null-handling rules (documented + unit-tested):
 * - A null/unknown value on a constrained field is treated as UNKNOWN and does
 *   NOT exclude the car (we'd rather surface a maybe than hide everything). This
 *   is especially important for price, which is null for most lots pre-live.
 * - An empty enum array means "no constraint" (always passes).
 */
export function matches(car: MatchableCar, filter: FilterCriteria): MatchResult {
  const reasons: CriterionResult[] = [];

  // min model year
  if (filter.minModelYear !== null) {
    if (car.modelYear == null) {
      reasons.push(
        pass('minModelYear', `שנת מודל לא ידועה — לא פוסל (מינימום ${filter.minModelYear})`),
      );
    } else {
      reasons.push(
        check(
          'minModelYear',
          car.modelYear >= filter.minModelYear,
          `שנת מודל ${car.modelYear} מול מינימום ${filter.minModelYear}`,
        ),
      );
    }
  }

  // min date on road
  if (filter.minDateOnRoad !== null) {
    if (car.dateOnRoad == null) {
      reasons.push(pass('minDateOnRoad', 'תאריך עליה לכביש לא ידוע — לא פוסל'));
    } else {
      reasons.push(
        check(
          'minDateOnRoad',
          car.dateOnRoad.getTime() >= filter.minDateOnRoad.getTime(),
          `עליה לכביש ${iso(car.dateOnRoad)} מול מינימום ${iso(filter.minDateOnRoad)}`,
        ),
      );
    }
  }

  // max mileage
  if (filter.maxMileage !== null) {
    if (car.mileage == null) {
      reasons.push(
        pass('maxMileage', `קילומטראז' לא ידוע — לא פוסל (מקסימום ${filter.maxMileage})`),
      );
    } else {
      reasons.push(
        check(
          'maxMileage',
          car.mileage <= filter.maxMileage,
          `קילומטראז' ${car.mileage} מול מקסימום ${filter.maxMileage}`,
        ),
      );
    }
  }

  // max hand
  if (filter.maxHand !== null) {
    if (car.hand == null) {
      reasons.push(pass('maxHand', `יד לא ידועה — לא פוסל (מקסימום ${filter.maxHand})`));
    } else {
      reasons.push(
        check(
          'maxHand',
          car.hand <= filter.maxHand,
          `יד ${car.hand} מול מקסימום ${filter.maxHand}`,
        ),
      );
    }
  }

  // transmission (any-of)
  if (filter.transmission.length > 0) {
    reasons.push(
      check(
        'transmission',
        filter.transmission.includes(car.transmission),
        `גיר ${car.transmission} מול ${filter.transmission.join('/')}`,
      ),
    );
  }

  // ownership (any-of)
  if (filter.ownership.length > 0) {
    reasons.push(
      check(
        'ownership',
        filter.ownership.includes(car.ownership),
        `בעלות ${car.ownership} מול ${filter.ownership.join('/')}`,
      ),
    );
  }

  // max price — null/unknown price NEVER fails this criterion
  if (filter.maxPrice !== null) {
    const price = effectivePrice(car);
    if (price === null) {
      reasons.push(pass('maxPrice', `מחיר לא ידוע — לא פוסל (מקסימום ${filter.maxPrice})`));
    } else {
      reasons.push(
        check('maxPrice', price <= filter.maxPrice, `מחיר ${price} מול מקסימום ${filter.maxPrice}`),
      );
    }
  }

  return { matched: reasons.every((r) => r.passed), reasons };
}

function check(criterion: string, passed: boolean, detail: string): CriterionResult {
  return { criterion, passed, detail };
}

function pass(criterion: string, detail: string): CriterionResult {
  return { criterion, passed: true, detail };
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
