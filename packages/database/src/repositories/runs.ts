import type { Prisma, ScrapeRun } from '@prisma/client';
import { prisma } from '../client';

export interface ScrapeRunStats {
  catalogsProcessed?: number;
  carsScraped?: number;
  carsMatched?: number;
  notificationsSent?: number;
  failures?: number;
  errorLog?: string | null;
}

/** Is a scrape currently running? Used as the execution lock check. */
export async function isScrapeRunning(): Promise<boolean> {
  const count = await prisma.scrapeRun.count({ where: { status: 'RUNNING' } });
  return count > 0;
}

/**
 * Start a run row (status RUNNING). Acts as the execution lock: callers should
 * check isScrapeRunning() first, or use tryStartScrapeRun() for an atomic guard.
 */
export async function startScrapeRun(): Promise<ScrapeRun> {
  return prisma.scrapeRun.create({ data: { status: 'RUNNING' } });
}

/**
 * Atomic-ish lock: refuses to start if another run is RUNNING. The check +
 * create run inside a serializable transaction to avoid two concurrent crons
 * both starting. Returns null if a run is already in progress.
 */
export async function tryStartScrapeRun(): Promise<ScrapeRun | null> {
  return prisma.$transaction(
    async (tx) => {
      const running = await tx.scrapeRun.count({ where: { status: 'RUNNING' } });
      if (running > 0) return null;
      return tx.scrapeRun.create({ data: { status: 'RUNNING' } });
    },
    { isolationLevel: 'Serializable' },
  );
}

export async function finishScrapeRun(
  id: number,
  status: 'SUCCESS' | 'FAILED',
  stats: ScrapeRunStats = {},
): Promise<ScrapeRun> {
  const run = await prisma.scrapeRun.findUniqueOrThrow({ where: { id } });
  const finishedAt = new Date();
  const data: Prisma.ScrapeRunUpdateInput = {
    status,
    finishedAt,
    durationMs: finishedAt.getTime() - run.startedAt.getTime(),
  };
  if (stats.catalogsProcessed !== undefined) data.catalogsProcessed = stats.catalogsProcessed;
  if (stats.carsScraped !== undefined) data.carsScraped = stats.carsScraped;
  if (stats.carsMatched !== undefined) data.carsMatched = stats.carsMatched;
  if (stats.notificationsSent !== undefined) data.notificationsSent = stats.notificationsSent;
  if (stats.failures !== undefined) data.failures = stats.failures;
  if (stats.errorLog !== undefined) data.errorLog = stats.errorLog;

  return prisma.scrapeRun.update({ where: { id }, data });
}

/**
 * Safety valve: mark any RUNNING runs older than maxAgeMs as FAILED so a crashed
 * worker can never hold the lock forever.
 */
export async function reapStaleRuns(maxAgeMs: number): Promise<number> {
  const cutoff = new Date(Date.now() - maxAgeMs);
  const result = await prisma.scrapeRun.updateMany({
    where: { status: 'RUNNING', startedAt: { lt: cutoff } },
    data: { status: 'FAILED', finishedAt: new Date(), errorLog: 'Reaped: exceeded max run age' },
  });
  return result.count;
}

export async function getLatestRun(): Promise<ScrapeRun | null> {
  return prisma.scrapeRun.findFirst({ orderBy: { startedAt: 'desc' } });
}

export async function listRecentRuns(take = 20): Promise<ScrapeRun[]> {
  return prisma.scrapeRun.findMany({ orderBy: { startedAt: 'desc' }, take });
}
