import { Router } from 'express';
import { matches, toFilterCriteria } from '@bidspirit/shared';
import type { CarWithAuction, ScrapeRun } from '@bidspirit/database';
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
 * A car belongs to a past/completed auction when its auction has ENDED or its
 * lot was not seen in the most recent successful scrape (ended auctions drop
 * out of discovery and simply stop being re-seen). `cutoff` is the start of the
 * last successful run; when there is no successful run yet we cannot tell, so
 * everything is considered current.
 */
function isCurrent(car: CarWithAuction, cutoff: Date | null): boolean {
  if (car.auction.status === 'ENDED') return false;
  if (cutoff && car.lastSeenAt < cutoff) return false;
  return true;
}

function lastSuccessfulStart(runs: ScrapeRun[]): Date | null {
  const ok = runs.find((r) => r.status === 'SUCCESS');
  return ok ? ok.startedAt : null;
}

/**
 * GET /api/cars — vehicles matching the active filter, multi-column sorted and
 * paginated. Past/completed-auction cars are excluded by default; pass
 * `?includeInactive=1` to include them. Matching is applied in-process so the
 * displayed set always reflects the latest filter settings.
 */
export function carsRouter(store: Store): Router {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const filter = await store.getActiveFilter();
      const criteria = toFilterCriteria(filter);

      const includeInactive =
        req.query.includeInactive === '1' || req.query.includeInactive === 'true';
      const cutoff = includeInactive ? null : lastSuccessfulStart(await store.listRecentRuns(50));

      const all = await store.findCars({});
      const matching = all.filter(
        (c) => matches(c, criteria).matched && (includeInactive || isCurrent(c, cutoff)),
      );

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
