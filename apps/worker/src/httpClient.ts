import { pickUserAgent } from '@bidspirit/shared';
import type { Logger } from '@bidspirit/shared';

/** Sleep helper. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Uniform random integer delay in [min, max] — responsible throttling. */
export function randomDelay(min: number, max: number): number {
  if (max <= min) return Math.max(0, min);
  return Math.floor(min + Math.random() * (max - min));
}

export interface HttpClientOptions {
  timeoutMs: number;
  maxRetries: number;
  delayMinMs: number;
  delayMaxMs: number;
  logger?: Logger;
  /** Injectable fetch (defaults to global fetch) — eases unit testing. */
  fetchImpl?: typeof fetch;
}

/**
 * Resilient JSON GET client for the Bidspirit public API.
 * - rotating User-Agent per attempt
 * - per-request timeout via AbortController
 * - retry with randomized backoff (responsible throttling)
 * Throws only after all retries are exhausted.
 */
export class HttpClient {
  private readonly opts: HttpClientOptions;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: HttpClientOptions) {
    this.opts = opts;
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch;
  }

  public async getJson<T = unknown>(url: string): Promise<T> {
    const { timeoutMs, maxRetries, delayMinMs, delayMaxMs, logger } = this.opts;
    let lastErr: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await this.fetchImpl(url, {
          method: 'GET',
          redirect: 'follow',
          signal: controller.signal,
          headers: {
            'user-agent': pickUserAgent(),
            accept: 'application/json, text/plain, */*',
            'accept-language': 'he-IL,he;q=0.9,en;q=0.8',
          },
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} ${res.statusText}`);
        }
        return (await res.json()) as T;
      } catch (err) {
        lastErr = err as Error;
        logger?.warn('http.getJson attempt failed', {
          url,
          attempt,
          maxRetries,
          error: lastErr.message,
        });
        if (attempt < maxRetries) {
          await sleep(randomDelay(delayMinMs, delayMaxMs) * attempt);
        }
      } finally {
        clearTimeout(timer);
      }
    }
    throw new Error(`GET failed after ${maxRetries} attempts: ${url} — ${lastErr?.message}`);
  }
}
