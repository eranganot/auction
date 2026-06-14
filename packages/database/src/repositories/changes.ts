import type { ChangeEvent, ChangeType } from '@prisma/client';
import { prisma } from '../client';

/** A single membership change in the match set, ready for digest/panel rendering. */
export interface MatchChange {
  carId: number;
  type: ChangeType; // 'NEW' | 'REMOVED'
  makeModel: string;
  lotUrl: string;
  reason: string | null;
}

export interface MatchDiffResult {
  added: MatchChange[];
  removed: MatchChange[];
}

/**
 * Diff the current match set against the persisted per-car match-state and
 * record the transitions. Idempotent: a second call with the same input yields
 * no changes (because isMatch already reflects reality).
 *
 * - NEW    = a car that now matches+is active but was previously not a match.
 * - REMOVED = a car previously matching that is no longer in the active match
 *             set (auction ended, lot not seen this run, or no longer matches).
 *
 * Persists ChangeEvent rows (denormalized makeModel/lotUrl) and flips Car.isMatch
 * inside a single transaction. Returns the changes for downstream notification.
 */
export async function applyMatchDiff(args: {
  matchingActiveCarIds: number[];
  runId?: number | null;
  runStartedAt: Date;
}): Promise<MatchDiffResult> {
  const ids = args.matchingActiveCarIds;
  const now = new Date();

  // Newly matching: in the current set but not previously flagged.
  const newCars = await prisma.car.findMany({
    where: { id: { in: ids }, isMatch: false },
    select: { id: true, makeModel: true, lotUrl: true },
  });

  // No longer matching: previously flagged but not in the current set.
  const goneCars = await prisma.car.findMany({
    where: { isMatch: true, id: { notIn: ids } },
    select: {
      id: true,
      makeModel: true,
      lotUrl: true,
      lastSeenAt: true,
      auction: { select: { status: true } },
    },
  });

  const removedReason = (c: { lastSeenAt: Date; auction: { status: string } }): string => {
    if (c.auction.status === 'ENDED') return 'AUCTION_ENDED';
    if (c.lastSeenAt < args.runStartedAt) return 'NOT_SEEN';
    return 'NO_LONGER_MATCHES';
  };

  const added: MatchChange[] = newCars.map((c) => ({
    carId: c.id,
    type: 'NEW' as ChangeType,
    makeModel: c.makeModel,
    lotUrl: c.lotUrl,
    reason: null,
  }));
  const removed: MatchChange[] = goneCars.map((c) => ({
    carId: c.id,
    type: 'REMOVED' as ChangeType,
    makeModel: c.makeModel,
    lotUrl: c.lotUrl,
    reason: removedReason(c),
  }));

  if (added.length === 0 && removed.length === 0) return { added, removed };

  await prisma.$transaction([
    prisma.changeEvent.createMany({
      data: [...added, ...removed].map((ch) => ({
        carId: ch.carId,
        type: ch.type,
        makeModel: ch.makeModel,
        lotUrl: ch.lotUrl,
        reason: ch.reason,
        runId: args.runId ?? null,
        detectedAt: now,
      })),
    }),
    prisma.car.updateMany({
      where: { id: { in: added.map((c) => c.carId) } },
      data: { isMatch: true, matchStateChangedAt: now },
    }),
    prisma.car.updateMany({
      where: { id: { in: removed.map((c) => c.carId) } },
      data: { isMatch: false, matchStateChangedAt: now },
    }),
  ]);

  return { added, removed };
}

/** Recent change events (newest first) for the in-app daily-changes panel. */
export async function listRecentChanges(limit = 100): Promise<ChangeEvent[]> {
  return prisma.changeEvent.findMany({
    orderBy: { detectedAt: 'desc' },
    take: limit,
  });
}

export async function countChangesSince(since: Date): Promise<number> {
  return prisma.changeEvent.count({ where: { detectedAt: { gte: since } } });
}
