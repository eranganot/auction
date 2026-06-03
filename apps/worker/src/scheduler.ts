import cron from 'node-cron';
import type { AppConfig, Logger } from '@bidspirit/shared';
import { runOnce } from './run';

/**
 * Either run a single one-shot cycle (RUN_ONCE=true — for Railway cron services)
 * or start a persistent in-process daily scheduler (node-cron).
 */
export async function start(config: AppConfig, logger: Logger): Promise<void> {
  if (config.scraper.runOnce) {
    logger.info('worker: one-shot mode');
    const summary = await runOnce(config, logger);
    logger.info('one-shot finished', { ...summary });
    return;
  }

  if (!cron.validate(config.scraper.cron)) {
    throw new Error(`Invalid SCRAPER_CRON expression: ${config.scraper.cron}`);
  }

  logger.info('worker: scheduled mode', {
    cron: config.scraper.cron,
    timezone: config.scraper.timezone,
  });

  cron.schedule(
    config.scraper.cron,
    async () => {
      try {
        await runOnce(config, logger);
      } catch (err) {
        logger.error('scheduled run threw', { error: (err as Error).message });
      }
    },
    { timezone: config.scraper.timezone },
  );

  // Keep the process alive.
  process.stdin.resume();
}
