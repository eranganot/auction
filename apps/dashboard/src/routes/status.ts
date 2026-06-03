import { Router } from 'express';
import type { ScrapeRun } from '@bidspirit/database';
import type { Store } from '../store';
import { asyncHandler } from '../errors';

function toRunSummary(run: ScrapeRun | null) {
  if (!run) return null;
  return {
    id: run.id,
    status: run.status,
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt ? run.finishedAt.toISOString() : null,
    durationMs: run.durationMs,
    catalogsProcessed: run.catalogsProcessed,
    carsScraped: run.carsScraped,
    carsMatched: run.carsMatched,
    notificationsSent: run.notificationsSent,
    failures: run.failures,
  };
}

/** GET /api/status — latest run, last successful run, and aggregate counts. */
export function statusRouter(store: Store): Router {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      const [latest, recent, totalCars, totalNotifications] = await Promise.all([
        store.getLatestRun(),
        store.listRecentRuns(50),
        store.countCars(),
        store.countNotifications(),
      ]);
      const lastSuccess = recent.find((r) => r.status === 'SUCCESS') ?? null;

      res.json({
        latestRun: toRunSummary(latest),
        lastSuccessfulRun: toRunSummary(lastSuccess),
        totals: { cars: totalCars, notifications: totalNotifications },
      });
    }),
  );

  return router;
}
