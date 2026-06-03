// @bidspirit/worker — scraper + scheduler entrypoint.
import { createLogger, loadConfig } from '@bidspirit/shared';
import { start } from './scheduler';

export const WORKER_APP = '@bidspirit/worker';

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config.logLevel, { app: WORKER_APP });
  await start(config, logger);
}

// Only auto-run when executed directly (not when imported by tests).
if (require.main === module) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({ level: 'error', msg: 'worker fatal', error: (err as Error).message }),
    );
    process.exit(1);
  });
}
