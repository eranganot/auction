import { Router } from 'express';
import type { ChangeEvent } from '@bidspirit/database';
import type { Store } from '../store';
import { asyncHandler } from '../errors';

function toChange(c: ChangeEvent) {
  return {
    id: c.id,
    type: c.type, // NEW | REMOVED
    makeModel: c.makeModel,
    lotUrl: c.lotUrl,
    reason: c.reason,
    detectedAt: c.detectedAt.toISOString(),
  };
}

/** GET /api/changes — recent daily match-set changes (new + removed). */
export function changesRouter(store: Store): Router {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const limitRaw = Number(req.query.limit);
      const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 100;
      const rows = await store.listRecentChanges(limit);
      res.json({ count: rows.length, changes: rows.map(toChange) });
    }),
  );

  return router;
}
