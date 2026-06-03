import { reapStaleRuns, tryStartScrapeRun } from '@bidspirit/database';
import type { ScrapeRun } from '@bidspirit/database';
import type { Logger } from '@bidspirit/shared';

/** A run is considered stale (crashed) after this long and is force-failed. */
export const STALE_RUN_MS = 2 * 60 * 60 * 1000; // 2 hours

/**
 * Acquire the single-run execution lock. First reaps any stale RUNNING rows
 * (so a crashed worker can't hold the lock forever), then atomically attempts
 * to start a new run. Returns the ScrapeRun on success, or null if another run
 * is genuinely in progress (overlapping execution prevented).
 */
export async function acquireRunLock(logger: Logger): Promise<ScrapeRun | null> {
  const reaped = await reapStaleRuns(STALE_RUN_MS);
  if (reaped > 0) logger.warn('reaped stale scrape runs', { reaped });

  const run = await tryStartScrapeRun();
  if (!run) {
    logger.warn('another scrape run is in progress — skipping');
    return null;
  }
  logger.info('acquired run lock', { runId: run.id });
  return run;
}
