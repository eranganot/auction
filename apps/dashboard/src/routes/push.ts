import { Router } from 'express';
import type { Store } from '../store';
import { asyncHandler } from '../errors';

export interface PushDeps {
  /** VAPID public key exposed to browsers so they can subscribe. */
  publicKey?: string;
}

/**
 * Web Push endpoints:
 *  - GET  /api/push/vapid     -> { enabled, publicKey }
 *  - POST /api/push/subscribe -> persist a browser PushSubscription
 */
export function pushRouter(store: Store, deps: PushDeps = {}): Router {
  const router = Router();

  router.get(
    '/vapid',
    asyncHandler(async (_req, res) => {
      res.json({ enabled: Boolean(deps.publicKey), publicKey: deps.publicKey ?? null });
    }),
  );

  router.post(
    '/subscribe',
    asyncHandler(async (req, res) => {
      const body = req.body as {
        endpoint?: unknown;
        keys?: { p256dh?: unknown; auth?: unknown };
      };
      const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : '';
      const p256dh = typeof body?.keys?.p256dh === 'string' ? body.keys.p256dh : '';
      const auth = typeof body?.keys?.auth === 'string' ? body.keys.auth : '';
      if (!endpoint || !p256dh || !auth) {
        return res.status(400).json({ error: 'endpoint and keys.{p256dh,auth} are required' });
      }
      const ua = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null;
      await store.savePushSubscription({ endpoint, p256dh, auth, userAgent: ua });
      return res.status(201).json({ ok: true });
    }),
  );

  return router;
}
