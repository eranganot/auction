import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Logger } from '@bidspirit/shared';

const ARTIFACTS_DIR = process.env.SCRAPER_ARTIFACTS_DIR || join(process.cwd(), 'artifacts');

/**
 * Persist failure context for post-mortem debugging. Writes a JSON file with
 * the error + arbitrary context to the artifacts dir. Never throws (best-effort).
 */
export async function captureFailure(
  name: string,
  context: Record<string, unknown>,
  logger: Logger,
): Promise<void> {
  try {
    await mkdir(ARTIFACTS_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = join(ARTIFACTS_DIR, `${stamp}-${name}.json`);
    await writeFile(file, JSON.stringify(context, null, 2), 'utf-8');
    logger.info('failure artifact written', { file });
  } catch (err) {
    logger.error('failed to write failure artifact', { error: (err as Error).message });
  }
}
