// @bidspirit/dashboard — Express API + static Hebrew RTL UI.
import { createLogger, loadConfig } from '@bidspirit/shared';
import { createApp } from './app';

export const DASHBOARD_APP = '@bidspirit/dashboard';
export { createApp } from './app';

function main(): void {
  const config = loadConfig();
  const logger = createLogger(config.logLevel, { app: DASHBOARD_APP });
  const app = createApp({ logger, vapidPublicKey: config.webpush.publicKey });
  app.listen(config.port, () => {
    logger.info('dashboard listening', { port: config.port });
  });
}

if (require.main === module) {
  main();
}
