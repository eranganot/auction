import {
  findCars,
  getActiveFilter,
  markCarNotified,
  recordNotification,
} from '@bidspirit/database';
import type { NotificationChannel } from '@bidspirit/database';
import { matches, toFilterCriteria } from '@bidspirit/shared';
import type { Logger, NotifiableCar, Notifier } from '@bidspirit/shared';

export interface NotifyDeps {
  notifiers: Notifier[];
  logger: Logger;
}

export interface NotifyMatchesResult {
  matched: number;
  notified: number;
}

/**
 * Find newly-matched, never-notified cars and alert on every enabled channel.
 *
 * Guarantees:
 * - only cars with notificationSentAt IS NULL are considered (no repeats);
 * - a car must satisfy the active filter (matching engine);
 * - a car is marked notified only if at least one channel sent successfully, so
 *   a total delivery failure is retried on the next run;
 * - one Notification row per (car, channel) is recorded (idempotent upsert).
 */
export async function notifyNewMatches(deps: NotifyDeps): Promise<NotifyMatchesResult> {
  const filter = await getActiveFilter();
  const criteria = toFilterCriteria(filter);

  const candidates = await findCars({ where: { notificationSentAt: null } });
  const matchedCars = candidates.filter((c) => matches(c, criteria).matched);

  deps.logger.info('matching complete', {
    candidates: candidates.length,
    matched: matchedCars.length,
  });

  if (matchedCars.length === 0) return { matched: 0, notified: 0 };

  const enabled = deps.notifiers.filter((n) => n.isEnabled());
  if (enabled.length === 0) {
    deps.logger.warn('no notification channels enabled — matches will not be sent', {
      matched: matchedCars.length,
    });
    return { matched: matchedCars.length, notified: 0 };
  }

  const payloads: NotifiableCar[] = matchedCars.map((c) => ({
    makeModel: c.makeModel,
    modelYear: c.modelYear,
    mileage: c.mileage,
    hand: c.hand,
    transmission: c.transmission,
    ownership: c.ownership,
    openingPrice: c.openingPrice,
    tariffPrice: c.tariffPrice,
    lotUrl: c.lotUrl,
    auctionTitle: c.auction?.title ?? null,
  }));

  // Send the batch once per channel.
  const results = await Promise.all(
    enabled.map(async (n) => ({ channel: n.channel, result: await n.notify(payloads) })),
  );
  const anySent = results.some((r) => r.result.ok && !r.result.skipped);

  // Record per-car, per-channel outcomes.
  for (const car of matchedCars) {
    for (const { channel, result } of results) {
      await recordNotification({
        carId: car.id,
        channel: channel as NotificationChannel,
        status: result.ok && !result.skipped ? 'SENT' : 'FAILED',
        error: result.error ?? null,
      });
    }
    if (anySent) await markCarNotified(car.id);
  }

  for (const { channel, result } of results) {
    deps.logger.info('notification channel result', {
      channel,
      ok: result.ok,
      skipped: result.skipped,
      detail: result.detail,
      error: result.error,
    });
  }

  return { matched: matchedCars.length, notified: anySent ? matchedCars.length : 0 };
}
