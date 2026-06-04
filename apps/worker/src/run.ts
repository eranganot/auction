import { disconnect, finishScrapeRun } from '@bidspirit/database';
import { buildNotifiers } from '@bidspirit/shared';
import type { AppConfig, Logger } from '@bidspirit/shared';
import { HttpClient, randomDelay, sleep } from './httpClient';
import { discoverAuctions } from './discovery';
import { extractLots } from './extract';
import { persistCatalog } from './pipeline';
import { notifyNewMatches } from './notifyMatches';
import { acquireRunLock } from './lock';
import { captureFailure } from './failure';

export interface RunSummary {
  ran: boolean;
  runId?: number;
  catalogs: number;
  cars: number;
  matched: number;
  notified: number;
  failures: number;
}

/**
 * Execute one full scrape cycle inside a ScrapeRun lock:
 * discover → (per catalog) extract + persist → match + notify → finalize stats.
 * Per-catalog failures are isolated so one bad catalog never aborts the run.
 */
export async function runOnce(config: AppConfig, logger: Logger): Promise<RunSummary> {
  const run = await acquireRunLock(logger, config.scraper.staleRunMs);
  if (!run) return { ran: false, catalogs: 0, cars: 0, matched: 0, notified: 0, failures: 0 };

  const http = new HttpClient({
    timeoutMs: config.scraper.timeoutMs,
    maxRetries: config.scraper.maxRetries,
    delayMinMs: config.scraper.delayMinMs,
    delayMaxMs: config.scraper.delayMaxMs,
    logger,
  });

  let catalogs = 0;
  let cars = 0;
  let failures = 0;
  const errors: string[] = [];

  try {
    const auctions = await discoverAuctions({
      http,
      region: config.bidspirit.region,
      content: config.bidspirit.content,
      logger,
    });

    for (const auction of auctions) {
      try {
        const lots = await extractLots(auction, { http, logger });
        const { carsUpserted } = await persistCatalog(auction, lots, logger);
        catalogs++;
        cars += carsUpserted;
      } catch (err) {
        failures++;
        const msg = `catalog ${auction.externalId}: ${(err as Error).message}`;
        errors.push(msg);
        logger.error('catalog failed — continuing', {
          catalog: auction.externalId,
          error: (err as Error).message,
        });
        await captureFailure(
          `catalog-${auction.externalId}`,
          { auction, error: (err as Error).message },
          logger,
        );
      }
      // Responsible throttling between catalogs.
      await sleep(randomDelay(config.scraper.delayMinMs, config.scraper.delayMaxMs));
    }

    const notifiers = buildNotifiers(config);
    const { matched, notified } = await notifyNewMatches({ notifiers, logger });

    await finishScrapeRun(run.id, failures > 0 && catalogs === 0 ? 'FAILED' : 'SUCCESS', {
      catalogsProcessed: catalogs,
      carsScraped: cars,
      carsMatched: matched,
      notificationsSent: notified,
      failures,
      errorLog: errors.length ? errors.join('\n') : null,
    });

    const summary: RunSummary = {
      ran: true,
      runId: run.id,
      catalogs,
      cars,
      matched,
      notified,
      failures,
    };
    logger.info('scrape run complete', { ...summary });
    return summary;
  } catch (err) {
    const message = (err as Error).message;
    logger.error('scrape run failed', { error: message });
    await captureFailure('run', { error: message, catalogs, cars, failures }, logger);
    await finishScrapeRun(run.id, 'FAILED', {
      catalogsProcessed: catalogs,
      carsScraped: cars,
      failures: failures + 1,
      errorLog: [message, ...errors].join('\n'),
    });
    return {
      ran: true,
      runId: run.id,
      catalogs,
      cars,
      matched: 0,
      notified: 0,
      failures: failures + 1,
    };
  } finally {
    await disconnect();
  }
}
