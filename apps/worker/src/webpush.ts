import webpush from 'web-push';
import { buildWebPushPayload } from '@bidspirit/shared';
import type { DigestPayload, NotifiableCar, Notifier, NotifyResult } from '@bidspirit/shared';

export interface PushSub {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface WebPushConfig {
  publicKey: string | undefined;
  privateKey: string | undefined;
  subject: string;
  /** Load the current set of browser subscriptions (from the DB). */
  loadSubscriptions: () => Promise<PushSub[]>;
  /** Called with an endpoint that the push service reported as gone (404/410). */
  onExpired: (endpoint: string) => Promise<void>;
  /** Injected sender (for tests). Defaults to the web-push library. */
  sendImpl?: (sub: PushSub, payload: string, opts: webpush.RequestOptions) => Promise<unknown>;
}

/**
 * Web Push notifier (VAPID). Fans the daily digest out to every stored browser
 * subscription. Disabled unless both VAPID keys are configured. Never throws;
 * prunes dead subscriptions on 404/410.
 */
export class WebPushNotifier implements Notifier {
  public readonly channel = 'WEBPUSH' as const;
  private readonly cfg: WebPushConfig;
  private configured = false;

  constructor(cfg: WebPushConfig) {
    this.cfg = cfg;
    if (cfg.publicKey && cfg.privateKey) {
      webpush.setVapidDetails(cfg.subject, cfg.publicKey, cfg.privateKey);
      this.configured = true;
    }
  }

  public isEnabled(): boolean {
    return this.configured;
  }

  // The legacy per-run "new matches" path: wrap as an add-only digest.
  public async notify(cars: NotifiableCar[]): Promise<NotifyResult> {
    return this.notifyDigest({ added: cars, removed: [], totalMatches: cars.length });
  }

  public async notifyDigest(digest: DigestPayload): Promise<NotifyResult> {
    if (!this.isEnabled()) {
      return { channel: this.channel, ok: false, skipped: true, detail: 'Web push not configured' };
    }
    if (digest.added.length === 0 && digest.removed.length === 0) {
      return { channel: this.channel, ok: true, skipped: true, detail: 'No changes' };
    }

    const subs = await this.cfg.loadSubscriptions();
    if (subs.length === 0) {
      return { channel: this.channel, ok: true, skipped: true, detail: 'No subscribers' };
    }

    const payload = JSON.stringify(buildWebPushPayload(digest));
    const send = this.cfg.sendImpl ?? defaultSend;
    const failures: string[] = [];
    let sent = 0;

    for (const sub of subs) {
      try {
        await send(sub, payload, { TTL: 60 * 60 * 12 });
        sent++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await this.cfg.onExpired(sub.endpoint);
        } else {
          failures.push(`${sub.endpoint.slice(0, 40)}…: ${(err as Error).message}`);
        }
      }
    }

    if (sent === 0 && failures.length > 0) {
      return {
        channel: this.channel,
        ok: false,
        skipped: false,
        detail: `Push failed for all ${subs.length} subscriber(s)`,
        error: failures.join('; '),
      };
    }
    return {
      channel: this.channel,
      ok: true,
      skipped: false,
      detail: `Pushed to ${sent}/${subs.length} subscriber(s)`,
      error: failures.length ? failures.join('; ') : undefined,
    };
  }
}

function defaultSend(
  sub: PushSub,
  payload: string,
  opts: webpush.RequestOptions,
): Promise<unknown> {
  return webpush.sendNotification(
    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
    payload,
    opts,
  );
}
