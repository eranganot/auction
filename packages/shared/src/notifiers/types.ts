import type { Ownership, Transmission } from '@bidspirit/database';

export type NotifyChannel = 'TELEGRAM' | 'EMAIL' | 'WEBPUSH';

/** A car payload for notifications (decoupled from the Prisma row). */
export interface NotifiableCar {
  makeModel: string;
  modelYear: number | null;
  mileage: number | null;
  hand: number | null;
  transmission: Transmission;
  ownership: Ownership;
  openingPrice: number | null;
  tariffPrice: number | null;
  lotUrl: string;
  auctionTitle?: string | null;
}

/** A car that left the match set (auction ended / sold / no longer matches). */
export interface RemovedItem {
  makeModel: string;
  lotUrl: string;
  reason?: string | null; // AUCTION_ENDED | NOT_SEEN | NO_LONGER_MATCHES
}

/** The daily change digest: what entered and left the match list since yesterday. */
export interface DigestPayload {
  added: NotifiableCar[];
  removed: RemovedItem[];
  /** Current total number of cars in the match set (for the summary line). */
  totalMatches: number;
}

export interface NotifyResult {
  channel: NotifyChannel;
  ok: boolean;
  skipped: boolean;
  detail: string;
  error?: string;
}

/** Common interface so new channels drop in without touching the pipeline. */
export interface Notifier {
  readonly channel: NotifyChannel;
  /** True only when the channel has all credentials it needs. */
  isEnabled(): boolean;
  /** Send a batch of newly-matched cars. Implementations must not throw. */
  notify(cars: NotifiableCar[]): Promise<NotifyResult>;
  /** Send the daily change digest (new + removed). Implementations must not throw. */
  notifyDigest(digest: DigestPayload): Promise<NotifyResult>;
}
