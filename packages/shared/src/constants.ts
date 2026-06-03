/**
 * Centralized Bidspirit API constants (from Phase 0 recon — see docs/RECON.md).
 * The site is an Angular SPA but all data is served by clean public JSON
 * endpoints (no auth/cookies). These constants are the single source of truth
 * for the worker's HTTP client and the deterministic lot-URL builder.
 */

/** Fastly-cached portal host that serves every endpoint we need. */
export const API_HOST = 'https://bidspirit-portal.global.ssl.fastly.net';

/** Public UI base used to build human-facing lot links. */
export const UI_BASE = 'https://cars.bidspirit.com';

/** Default query params shared by all calls. */
export const DEFAULT_QUERY = {
  cdnSubDomain: 'cars',
  lang: 'he',
} as const;

export const ENDPOINTS = {
  /** Discovery — all auctions/catalogs bucketed by status. */
  homePageData: '/services/portal/getHomePageData',
  /** All lots in a catalog (single call, returns a JSON array). */
  catalogItems: '/services/catalogs/getItems',
  /** Single lot detail (optional / fallback). */
  lotItemInfo: '/services/catalogs/getLotItemInfo',
  /** Auction metadata (optional). */
  auctionPageData: '/services/portal/getAuctionPageData',
} as const;

/** Buckets inside getHomePageData.auctionsLists. */
export const AUCTION_BUCKET = {
  UPCOMING: 'UPCOMING',
  ENDED: 'ENDED',
} as const;

/** We only ever scrape CARS catalogs (UPCOMING also contains MACHINES/ART). */
export const CONTENT_TYPE_CARS = 'CARS';

/** Rotating, realistic desktop User-Agent strings for resilience. */
export const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
] as const;

export function pickUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)] as string;
}

/**
 * Build the canonical public lot URL. This URL is the primary UPSERT key, so it
 * must be deterministic.
 *
 * Pattern (from recon):
 *   {UI_BASE}/ui/lotPage/{houseCode}/source/catalog/auction/{intKey}/lot/{idInApp}/?lang=he
 */
export function buildLotUrl(
  houseCode: string,
  intKey: string | number,
  idInApp: string | number,
): string {
  return `${UI_BASE}/ui/lotPage/${houseCode}/source/catalog/auction/${intKey}/lot/${idInApp}/?lang=he`;
}

/** Build a fully-qualified endpoint URL with merged query params. */
export function buildApiUrl(
  endpoint: string,
  params: Record<string, string | number | boolean>,
): string {
  const url = new URL(API_HOST + endpoint);
  const merged = { ...DEFAULT_QUERY, ...params };
  for (const [k, v] of Object.entries(merged)) {
    url.searchParams.set(k, String(v));
  }
  return url.toString();
}
