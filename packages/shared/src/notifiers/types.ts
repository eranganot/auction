import type { Ownership, Transmission } from '@bidspirit/database';

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

export interface NotifyResult {
  channel: 'TELEGRAM' | 'EMAIL';
  ok: boolean;
  skipped: boolean;
  detail: string;
  error?: string;
}

/** Common interface so new channels drop in without touching the pipeline. */
export interface Notifier {
  readonly channel: 'TELEGRAM' | 'EMAIL';
  /** True only when the channel has all credentials it needs. */
  isEnabled(): boolean;
  /** Send a batch of newly-matched cars. Implementations must not throw. */
  notify(cars: NotifiableCar[]): Promise<NotifyResult>;
}
