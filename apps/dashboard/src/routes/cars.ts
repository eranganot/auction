import { Router } from 'express';
import { matches, toFilterCriteria } from '@bidspirit/shared';
import type { Store } from '../store';
import { asyncHandler } from '../errors';
import { parseSort, sortCars } from '../sort';
import { toCarDTO } from '../serialize';

const MAX_PAGE_SIZE = 200;

function clampInt(raw: unknown, fallback: number, min: number, max: number): number {
  const n = typeof raw === 'string' ? parseInt(raw, 10) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/**
 * GET /api/cars — only vehicles matching the active filter, multi-column sorted
 * and paginated. Matching is applied in-process against the active filter so
 * the displayed set always reflects the latest filter settings.
 */
export function carsRouter(store: Store): Router {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const filter = await store.getActiveFilter();
      const criteria = toFilterCriteria(filter);

      const all = await store.findCars({});
      const matching = all.filter((c) => matches(c, criteria).matched);

      const sorted = sortCars(matching, parseSort(req.query.sort));

      const page = clampInt(req.query.page, 1, 1, 1_000_000);
      const pageSize = clampInt(req.query.pageSize, 50, 1, MAX_PAGE_SIZE);
      const start = (page - 1) * pageSize;
      const pageItems = sorted.slice(start, start + pageSize);

      res.json({
        data: pageItems.map(toCarDTO),
        total: matching.length,
        page,
        pageSize,
      });
    }),
  );

  return router;
}
