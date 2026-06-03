import {
  AUCTION_BUCKET,
  CONTENT_TYPE_CARS,
  ENDPOINTS,
  buildApiUrl,
  parseDate,
  cleanString,
} from '@bidspirit/shared';
import type { Logger, NormalizedAuction, RawAuction } from '@bidspirit/shared';
import type { AuctionStatus } from '@bidspirit/database';
import type { HttpClient } from './httpClient';

interface HomePageData {
  auctionsLists?: Record<string, RawAuction[] | undefined>;
}

/** Map the feed's free-text auction state to our AuctionStatus enum. */
export function mapAuctionStatus(state: unknown): AuctionStatus {
  const s = cleanString(state).toUpperCase();
  if (s === 'PENDING' || s === 'READY' || s === 'RUNNING' || s === 'ENDED') {
    return s as AuctionStatus;
  }
  return 'UNKNOWN';
}

/**
 * PURE archive filter (unit-tested against fixtures). From a raw home payload,
 * keep ONLY live/upcoming CARS catalogs:
 *   - bucket = auctionsLists.UPCOMING (ENDED is intentionally ignored)
 *   - contentType === 'CARS'
 *   - hidden !== true
 */
export function filterLiveCarAuctions(home: HomePageData): NormalizedAuction[] {
  const upcoming = home.auctionsLists?.[AUCTION_BUCKET.UPCOMING] ?? [];
  const out: NormalizedAuction[] = [];
  for (const a of upcoming) {
    if (!a) continue;
    if (a.contentType !== CONTENT_TYPE_CARS) continue;
    if (a.hidden === true) continue;
    const externalId = a.intKey != null ? String(a.intKey) : '';
    if (!externalId) continue;
    out.push({
      externalId,
      houseCode: cleanString(a.houseCode),
      title: cleanString(a.name),
      status: mapAuctionStatus(a.state),
      startsAt:
        typeof a.startTimeMillis === 'number' ? new Date(a.startTimeMillis) : parseDate(a.date),
    });
  }
  return out;
}

export interface DiscoveryDeps {
  http: HttpClient;
  region: string;
  content: string;
  logger: Logger;
}

/** Fetch the home payload and return the filtered live CARS catalogs. */
export async function discoverAuctions(deps: DiscoveryDeps): Promise<NormalizedAuction[]> {
  const url = buildApiUrl(ENDPOINTS.homePageData, {
    content: deps.content,
    region: deps.region,
  });
  const home = await deps.http.getJson<HomePageData>(url);
  const auctions = filterLiveCarAuctions(home);
  deps.logger.info('discovery complete', { liveCarCatalogs: auctions.length });
  return auctions;
}
