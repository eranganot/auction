import { Router } from 'express';
import webpush from 'web-push';
import type { Store } from '../store';
import { asyncHandler } from '../errors';

export interface PushSendSub {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushDeps {
  /** VAPID public key exposed to browsers so they can subscribe. */
  publicKey?: string;
  /** VAPID private key — required to send (test) notifications from here. */
  privateKey?: string;
  subject?: string;
  /** Injected sender (for tests). Defaults to the web-push library. */
  sendImpl?: (sub: PushSendSub, payload: string) => Promise<unknown>;
}

/**
 * Web Push endpoints:
 *  - GET  /api/push/vapid     -> { enabled, publicKey, subscribers }
 *  - POST /api/push/subscribe -> persist a browser PushSubscription
 *  - POST /api/push/test      -> send a test notification to all subscriptions
 */
export function pushRouter(store: Store, deps: PushDeps = {}): Router {
  const router = Router();
  const canSend = Boolean(deps.sendImpl) || Boolean(deps.publicKey && deps.privateKey);
  if (!deps.sendImpl && deps.publicKey && deps.privateKey) {
    webpush.setVapidDetails(
      deps.subject || 'mailto:admin@bidspirit.local',
      deps.publicKey,
      deps.privateKey,
    );
  }
  const send =
    deps.sendImpl ??
    ((sub: PushSendSub, payload: string) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
        { TTL: 300 },
      ));

  router.get(
    '/vapid',
    asyncHandler(async (_req, res) => {
      const subscribers = await store.countPushSubscriptions();
      res.json({
        enabled: Boolean(deps.publicKey),
        publicKey: deps.publicKey ?? null,
        subscribers,
      });
    }),
  );

  router.post(
    '/subscribe',
    asyncHandler(async (req, res) => {
      const body = req.body as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
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

  router.post(
    '/test',
    asyncHandler(async (_req, res) => {
      if (!canSend) {
        return res.status(400).json({ error: 'Web push is not configured (missing VAPID keys)' });
      }
      const subs = await store.listPushSubscriptions();
      const payload = JSON.stringify({
        title: '🔔 התראת בדיקה',
        body: 'התראות הדפדפן פעילות. כך תקבל עדכון על שינויים ברשימה.',
        url: '/',
      });
      let sent = 0;
      let failed = 0;
      for (const s of subs) {
        try {
          await send({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth }, payload);
          sent++;
        } catch (err) {
          const code = (err as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) await store.deletePushSubscription(s.endpoint);
          failed++;
        }
      }
      return res.json({ subscribers: subs.length, sent, failed });
    }),
  );

  return router;
}
