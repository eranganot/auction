import { buildNotifiers } from '@bidspirit/shared';
import type { AppConfig, Notifier } from '@bidspirit/shared';
import { deletePushSubscription, listPushSubscriptions } from '@bidspirit/database';
import { WebPushNotifier } from './webpush';

/**
 * Full notifier set for the worker: the config-driven Telegram + Email channels
 * (from @bidspirit/shared) plus a DB-backed Web Push channel. Web push lives in
 * the worker so the `web-push` dependency stays out of the shared/dashboard build.
 */
export function buildWorkerNotifiers(config: AppConfig): Notifier[] {
  const webpush = new WebPushNotifier({
    publicKey: config.webpush.publicKey,
    privateKey: config.webpush.privateKey,
    subject: config.webpush.subject,
    loadSubscriptions: async () =>
      (await listPushSubscriptions()).map((s) => ({
        endpoint: s.endpoint,
        p256dh: s.p256dh,
        auth: s.auth,
      })),
    onExpired: (endpoint: string) => deletePushSubscription(endpoint),
  });
  return [...buildNotifiers(config), webpush];
}
