import {
  ENDPOINTS,
  buildApiUrl,
  buildLotUrl,
  buildMakeModel,
  mapHand,
  mapOwnership,
  mapTransmission,
  parseDate,
  parseMileage,
  parsePrice,
  parseYear,
} from '@bidspirit/shared';
import type { Logger, NormalizedAuction, NormalizedCar, RawLot } from '@bidspirit/shared';
import type { HttpClient } from './httpClient';

/**
 * PURE lot normalizer (unit-tested against fixtures). Converts one raw getItems
 * element + its parent auction into a clean NormalizedCar. Returns null for
 * non-car items (no carInfo) or items missing a stable id.
 */
export function normalizeLot(raw: RawLot, auction: NormalizedAuction): NormalizedCar | null {
  const info = raw.carInfo;
  if (!info) return null;
  const idInApp = raw.idInApp ?? info.lotId;
  if (idInApp == null || String(idInApp) === '') return null;

  const lotId = String(idInApp);
  const lotUrl = buildLotUrl(auction.houseCode, auction.externalId, lotId);
  // NOTE: Phase 0 recon captured imagesList/imagesBase but not the CDN URL
  // pattern, so we do not fabricate a host here. imageUrl stays null until the
  // pattern is confirmed; the dashboard renders a placeholder in the meantime.
  const imageUrl: string | null = null;

  return {
    lotId,
    lotUrl,
    makeModel: buildMakeModel(info.manufacturer, info.model),
    modelYear: parseYear(info.modelYear),
    dateOnRoad: parseDate(info.dateOnRoad),
    mileage: parseMileage(info.mileage),
    transmission: mapTransmission(info.gear),
    hand: mapHand(info.hand),
    ownership: mapOwnership(info.ownership),
    tariffPrice: parsePrice(info.tariffPrice ?? null),
    openingPrice: parsePrice(raw.startPrice ?? null),
    imageUrl,
    status: auction.status,
  };
}

/** PURE: normalize a whole getItems array for one auction. */
export function normalizeLots(items: RawLot[], auction: NormalizedAuction): NormalizedCar[] {
  const out: NormalizedCar[] = [];
  for (const raw of items) {
    const car = normalizeLot(raw, auction);
    if (car) out.push(car);
  }
  return out;
}

export interface ExtractDeps {
  http: HttpClient;
  logger: Logger;
}

/**
 * Fetch and normalize all lots for one catalog. getItems returns the whole
 * catalog in a single call (no pagination — see recon). Throws on fetch failure
 * so the caller can isolate the failure per-catalog.
 */
export async function extractLots(
  auction: NormalizedAuction,
  deps: ExtractDeps,
): Promise<NormalizedCar[]> {
  const url = buildApiUrl(ENDPOINTS.catalogItems, {
    catalogKey: auction.externalId,
    allowEro: true,
    allowHidden: false,
  });
  const items = await deps.http.getJson<RawLot[]>(url);
  const list = Array.isArray(items) ? items : [];
  const cars = normalizeLots(list, auction);
  deps.logger.info('catalog extracted', {
    catalog: auction.externalId,
    rawItems: list.length,
    cars: cars.length,
  });
  return cars;
}
