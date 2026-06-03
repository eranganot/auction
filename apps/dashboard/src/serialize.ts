import type { CarWithAuction } from '@bidspirit/database';
import { ownershipLabelHe, transmissionLabelHe } from '@bidspirit/shared';

export interface CarDTO {
  id: number;
  lotId: string;
  lotUrl: string;
  makeModel: string;
  modelYear: number | null;
  dateOnRoad: string | null;
  mileage: number | null;
  transmission: string;
  transmissionLabel: string;
  hand: number | null;
  ownership: string;
  ownershipLabel: string;
  tariffPrice: number | null;
  openingPrice: number | null;
  imageUrl: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  auctionTitle: string;
  auctionStatus: string;
}

export function toCarDTO(car: CarWithAuction): CarDTO {
  return {
    id: car.id,
    lotId: car.lotId,
    lotUrl: car.lotUrl,
    makeModel: car.makeModel,
    modelYear: car.modelYear,
    dateOnRoad: car.dateOnRoad ? car.dateOnRoad.toISOString() : null,
    mileage: car.mileage,
    transmission: car.transmission,
    transmissionLabel: transmissionLabelHe(car.transmission),
    hand: car.hand,
    ownership: car.ownership,
    ownershipLabel: ownershipLabelHe(car.ownership),
    tariffPrice: car.tariffPrice,
    openingPrice: car.openingPrice,
    imageUrl: car.imageUrl,
    firstSeenAt: car.firstSeenAt.toISOString(),
    lastSeenAt: car.lastSeenAt.toISOString(),
    auctionTitle: car.auction?.title ?? '',
    auctionStatus: car.auction?.status ?? '',
  };
}
