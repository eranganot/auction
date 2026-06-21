import { Router } from 'express';
import { matches, toFilterCriteria } from '@bidspirit/shared';
import type { CarWithAuction, ScrapeRun } from '@bidspirit/database';
import type { Store } from '../store';
import { asyncHandler } from '../errors';
import { parseSort, sortCars } from '../sort';
import { toCarDTO } from '../serialize';

const MAX_PAGE_SIZE = 200;
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_WITHIN_DAYS = 7;

function clampInt(raw: unknown, fallback: number, min: number, max: number): number {
  const n = typeof raw === 'string' ? parseInt(raw, 10) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/**
 * Parse the date-horizon. Returns the number of days to look ahead, or null for
 * "no limit" (?withinDays=all or 0). Defaults to the next 7 days.
 */
function parseWithinDays(raw: unknown): number | null {
  if (raw === undefined) return DEFAULT_WITHIN_DAYS;
  if (raw === 'all' || raw === '0') return null;
  const n = typeof raw === 'string' ? parseInt(raw, 10) : NaN;
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_WITHIN_DAYS;
  return Math.min(n, 365);
}

/**
 * A car belongs to a past/completed auction when its auction has ENDED or its
 * lot was not seen in the most recent successful scrape (ended auctions drop
 * out of discovery and stop being re-seen). When there is no successful run yet
 * we cannot tell, so everything is considered current.
 */
function isCurrent(car: CarWithAuction, cutoff: Date | null): boolean {
  if (car.auction.status === 'ENDED') return false;
  if (cutoff && car.lastSeenAt < cutoff) return false;
  return true;
}

/**
 * Within the date horizon: the auction sale date (startsAt) is known and falls
 * on/before now + `days`. Undated auctions are excluded from a windowed view
 * (they surface under ?withinDays=all). The active-only check already handles
 * the past side, so only an upper bound is needed.
 */
function withinHorizon(car: CarWithAuction, days: number | null, now: number): boolean {
  if (days === null) return true;
  const s = car.auction.startsAt;
  if (!s) return false;
  return s.getTime() <= now + days * DAY_MS;
}

function lastSuccessfulStart(runs: ScrapeRun[]): Date | null {
  const ok = runs.find((r) => r.status === 'SUCCESS');
  return ok ? ok.startedAt : null;
}

/**
 * GET /api/cars — vehicles matching the active filter, sorted and paginated.
 * Defaults: past/completed-auction cars are excluded and only auctions in the
 * next 7 days are shown. Override with `?includeInactive=1` and `?withinDays=N`
 * (or `all`).
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
      const withinDays = parseWithinDays(req.query.withinDays);
      const now = Date.now();
      const cutoff = includeInactive ? null : lastSuccessfulStart(await store.listRecentRuns(50));

      const all = await store.findCars({});
      const matching = all.filter(
        (c) =>
          matches(c, criteria).matched &&
          (includeInactive || isCurrent(c, cutoff)) &&
          withinHorizon(c, withinDays, now),
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
        withinDays: withinDays ?? 'all',
      });
    }),
  );

  return router;
}
