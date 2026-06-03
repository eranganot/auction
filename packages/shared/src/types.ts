import type { Ownership, Transmission } from '@bidspirit/database';

/**
 * RawLot — loosely-typed shape of one element of getItems (see docs/RECON.md).
 * Only the fields we read are declared; everything is optional/nullable because
 * the live feed is inconsistent and ingestion must never crash on a missing key.
 */
export interface RawCarInfo {
  lotId?: number | string;
  manufacturer?: string;
  model?: string;
  modelYear?: number | string;
  dateOnRoad?: string;
  mileage?: number | string;
  gear?: string;
  hand?: string;
  ownership?: string;
  tariffPrice?: number | string | null;
}

export interface RawLot {
  idInApp?: number | string;
  auctionIdInApp?: number | string;
  startPrice?: number | string | null;
  estimatedPrice?: number | string | null;
  imagesList?: string[];
  imagesBase?: string;
  carInfo?: RawCarInfo | null;
  [key: string]: unknown;
}

/** RawAuction — fields we read from auctionsLists[BUCKET][]. */
export interface RawAuction {
  intKey?: number | string;
  houseCode?: string;
  name?: string;
  state?: string;
  contentType?: string;
  date?: string;
  time?: string;
  startTimeMillis?: number;
  hidden?: boolean;
  [key: string]: unknown;
}

/** NormalizedCar — clean, typed record ready for persistence + matching. */
export interface NormalizedCar {
  lotId: string;
  lotUrl: string;
  makeModel: string;
  modelYear: number | null;
  dateOnRoad: Date | null;
  mileage: number | null;
  transmission: Transmission;
  hand: number | null;
  ownership: Ownership;
  tariffPrice: number | null;
  openingPrice: number | null;
  imageUrl: string | null;
  status: string | null;
}

/** NormalizedAuction — discovery output, filtered to live CARS catalogs. */
export interface NormalizedAuction {
  externalId: string;
  houseCode: string;
  title: string;
  status: string;
  startsAt: Date | null;
}

/**
 * FilterCriteria — the subset of UserFilter the matching engine evaluates.
 * Empty enum arrays mean "no constraint". Null scalar means "no constraint".
 */
export interface FilterCriteria {
  minModelYear: number | null;
  minDateOnRoad: Date | null;
  maxMileage: number | null;
  maxHand: number | null;
  maxPrice: number | null;
  transmission: Transmission[];
  ownership: Ownership[];
}

/** Per-criterion outcome for transparency + testability. */
export interface CriterionResult {
  criterion: string;
  passed: boolean;
  detail: string;
}

export interface MatchResult {
  matched: boolean;
  reasons: CriterionResult[];
}
