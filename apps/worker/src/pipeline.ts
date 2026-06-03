import { upsertAuction, upsertCar } from '@bidspirit/database';
import type { AuctionStatus } from '@bidspirit/database';
import type { Logger, NormalizedAuction, NormalizedCar } from '@bidspirit/shared';

export interface PersistResult {
  auctionId: number;
  carsUpserted: number;
}

/**
 * Persist one catalog: UPSERT the auction, then UPSERT every lot against it.
 * Idempotent — re-running refreshes mutable fields and bumps lastSeenAt without
 * duplicating rows or resetting firstSeenAt/notificationSentAt.
 */
export async function persistCatalog(
  auction: NormalizedAuction,
  cars: NormalizedCar[],
  logger: Logger,
): Promise<PersistResult> {
  const row = await upsertAuction({
    externalId: auction.externalId,
    title: auction.title,
    status: auction.status as AuctionStatus,
    houseCode: auction.houseCode || null,
    startsAt: auction.startsAt,
    url: null,
  });

  let carsUpserted = 0;
  for (const car of cars) {
    await upsertCar({
      lotId: car.lotId,
      lotUrl: car.lotUrl,
      auctionId: row.id,
      makeModel: car.makeModel,
      modelYear: car.modelYear,
      dateOnRoad: car.dateOnRoad,
      mileage: car.mileage,
      transmission: car.transmission,
      hand: car.hand,
      ownership: car.ownership,
      tariffPrice: car.tariffPrice,
      openingPrice: car.openingPrice,
      imageUrl: car.imageUrl,
      status: car.status,
    });
    carsUpserted++;
  }

  logger.info('catalog persisted', {
    catalog: auction.externalId,
    auctionId: row.id,
    carsUpserted,
  });
  return { auctionId: row.id, carsUpserted };
}
