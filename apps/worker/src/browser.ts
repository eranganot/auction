import { pickUserAgent } from '@bidspirit/shared';
import type { Logger } from '@bidspirit/shared';

/**
 * Playwright fallback. The runtime hot path is pure JSON/HTTP (see docs/RECON.md);
 * this module is only used if the public API changes shape or starts gating
 * requests. It launches a stealthy Chromium and replays the same GET through a
 * real browser context, then returns the parsed JSON body.
 *
 * Playwright is imported dynamically so the worker boots (and unit tests run)
 * even when browser binaries are not installed — the import only happens if the
 * fallback is actually invoked.
 */
export interface BrowserOptions {
  headless: boolean;
  timeoutMs: number;
  logger?: Logger;
}

const STEALTH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-blink-features=AutomationControlled',
  '--disable-dev-shm-usage',
];

export async function fetchJsonViaBrowser<T = unknown>(
  url: string,
  opts: BrowserOptions,
): Promise<T> {
  const { chromium } = (await import('playwright')) as typeof import('playwright');
  const browser = await chromium.launch({ headless: opts.headless, args: STEALTH_ARGS });
  try {
    const context = await browser.newContext({ userAgent: pickUserAgent() });
    const request = context.request;
    const res = await request.get(url, { timeout: opts.timeoutMs });
    if (!res.ok()) {
      throw new Error(`Browser GET HTTP ${res.status()}`);
    }
    return (await res.json()) as T;
  } finally {
    await browser.close();
  }
}
