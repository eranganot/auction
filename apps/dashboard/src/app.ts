import { join } from 'node:path';
import express, { type Express } from 'express';
import type { Logger } from '@bidspirit/shared';
import { createLogger } from '@bidspirit/shared';
import { defaultStore, type Store } from './store';
import { errorHandler } from './errors';
import { carsRouter } from './routes/cars';
import { filtersRouter } from './routes/filters';
import { statusRouter } from './routes/status';

export interface AppDeps {
  store?: Store;
  logger?: Logger;
  /** Absolute path to the static UI directory. Defaults to ../public. */
  publicDir?: string;
}

/**
 * Build the Express app: JSON API under /api + static Hebrew UI. Pure factory
 * (no listen) so tests can drive it with supertest and a fake store.
 */
export function createApp(deps: AppDeps = {}): Express {
  const store = deps.store ?? defaultStore;
  const logger = deps.logger ?? createLogger('info', { app: '@bidspirit/dashboard' });
  const publicDir = deps.publicDir ?? join(__dirname, '..', 'public');

  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '256kb' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/cars', carsRouter(store));
  app.use('/api/filters', filtersRouter(store));
  app.use('/api/status', statusRouter(store));

  // Static Hebrew UI (index.html + app.js).
  app.use(express.static(publicDir));

  app.use(errorHandler(logger));
  return app;
}
