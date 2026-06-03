import { Router } from 'express';
import { z } from 'zod';
import { Ownership, Transmission } from '@bidspirit/database';
import type { UserFilter } from '@bidspirit/database';
import type { Store } from '../store';
import { ApiError, asyncHandler } from '../errors';

/** Nullable, optional non-negative integer (absent = leave unchanged). */
const nonNegIntNullable = z.number().int().min(0).nullable().optional();

const filterUpdateSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    minModelYear: z.number().int().min(1900).max(2100).nullable().optional(),
    minDateOnRoad: z.coerce.date().nullable().optional(),
    maxMileage: nonNegIntNullable,
    maxHand: z.number().int().min(1).max(20).nullable().optional(),
    maxPrice: nonNegIntNullable,
    transmission: z.array(z.nativeEnum(Transmission)).optional(),
    ownership: z.array(z.nativeEnum(Ownership)).optional(),
  })
  .strict();

function toFilterResponse(f: UserFilter) {
  return {
    id: f.id,
    name: f.name,
    minModelYear: f.minModelYear,
    minDateOnRoad: f.minDateOnRoad ? f.minDateOnRoad.toISOString() : null,
    maxMileage: f.maxMileage,
    maxHand: f.maxHand,
    maxPrice: f.maxPrice,
    transmission: f.transmission,
    ownership: f.ownership,
    isActive: f.isActive,
    updatedAt: f.updatedAt.toISOString(),
  };
}

export function filtersRouter(store: Store): Router {
  const router = Router();

  // GET /api/filters — current active filter.
  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      const filter = await store.getActiveFilter();
      res.json(toFilterResponse(filter));
    }),
  );

  // POST /api/filters — validate + persist; applies in real time (next GET /cars).
  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const parsed = filterUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ApiError(400, 'נתוני סינון לא תקינים', parsed.error.flatten());
      }
      const updated = await store.updateActiveFilter(parsed.data);
      res.json(toFilterResponse(updated));
    }),
  );

  return router;
}
