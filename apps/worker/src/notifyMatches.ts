import {
  applyMatchDiff,
  findCars,
  getActiveFilter,
  markCarNotified,
  recordNotification,
} from '@bidspirit/database';
import type { NotificationChannel } from '@bidspirit/database';
import { matches, toFilterCriteria } from '@bidspirit/shared';
import type {
  DigestPayload,
  Logger,
  NotifiableCar,
  Notifier,
  RemovedItem,
} from '@bidspirit/shared';

export interface NotifyDeps {
  notifiers: Notifier[];
  logger: Logger;
  runId?: number | null;
  /** Start of the current run — a car is "active" only if seen at/after this. */
  runStartedAt: Date;
}

export interface NotifyResultSummary {
  /** Cars currently matching the active filter AND still active. */
  matched: number;
  added: number;
  removed: number;
  /** Number of newly-added cars announced (0 if nothing sent). */
  notified: number;
}

/**
 * Detect the day-over-day change in the match set and send a digest — but only
 * when something actually changed.
 *
 * A car is in the current match set iff it satisfies the active filter AND is
 * still active (its auction has not ENDED and the lot was seen in this run).
 * applyMatchDiff persists the NEW/REMOVED transitions and flips Car.isMatch, so
 * the digest fires once per real change and never repeats.
 */
export async function notifyDailyChanges(deps: NotifyDeps): Promise<NotifyResultSummary> {
  const filter = await getActiveFilter();
  const criteria = toFilterCriteria(filter);

  const all = await findCars({});
  const matchingActive = all.filter(
    (c) =>
      c.auction.status !== 'ENDED' &&
      c.lastSeenAt >= deps.runStartedAt &&
      matches(c, criteria).matched,
  );
  const matchingActiveCarIds = matchingActive.map((c) => c.id);

  const { added, removed } = await applyMatchDiff({
    matchingActiveCarIds,
    runId: deps.runId ?? null,
    runStartedAt: deps.runStartedAt,
  });

  deps.logger.info('match diff computed', {
    matching: matchingActiveCarIds.length,
    added: added.length,
    removed: removed.length,
  });

  const summary: NotifyResultSummary = {
    matched: matchingActiveCarIds.length,
    added: added.length,
    removed: removed.length,
    notified: 0,
  };

  // Only-when-changed: skip the message entirely on quiet days.
  if (added.length === 0 && removed.length === 0) return summary;

  const byId = new Map(matchingActive.map((c) => [c.id, c]));
  const addedCars: NotifiableCar[] = added.flatMap((a) => {
    const c = byId.get(a.carId);
    if (!c) return [];
    return [
      {
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
      },
    ];
  });
  const removedItems: RemovedItem[] = removed.map((r) => ({
    makeModel: r.makeModel,
    lotUrl: r.lotUrl,
    reason: r.reason,
  }));
  const digest: DigestPayload = {
    added: addedCars,
    removed: removedItems,
    totalMatches: matchingActiveCarIds.length,
  };

  const enabled = deps.notifiers.filter((n) => n.isEnabled());
  if (enabled.length === 0) {
    deps.logger.warn('no notification channels enabled — digest not sent', {
      added: added.length,
      removed: removed.length,
    });
    return summary;
  }

  const results = await Promise.all(
    enabled.map(async (n) => ({ channel: n.channel, result: await n.notifyDigest(digest) })),
  );
  const anySent = results.some((r) => r.result.ok && !r.result.skipped);

  // Record per-(added car, channel) outcomes; mark added cars notified once.
  for (const a of added) {
    for (const { channel, result } of results) {
      await recordNotification({
        carId: a.carId,
        channel: channel as NotificationChannel,
        status: result.ok && !result.skipped ? 'SENT' : 'FAILED',
        error: result.error ?? null,
      });
    }
    if (anySent) await markCarNotified(a.carId);
  }

  for (const { channel, result } of results) {
    deps.logger.info('digest channel result', {
      channel,
      ok: result.ok,
      skipped: result.skipped,
      detail: result.detail,
      error: result.error,
    });
  }

  summary.notified = anySent ? added.length : 0;
  return summary;
}
