import type { Car, Ownership, Prisma, Transmission } from '@prisma/client';
import { prisma } from '../client';

export interface CarUpsertInput {
  lotId: string;
  lotUrl: string;
  auctionId: number;
  makeModel: string;
  modelYear?: number | null;
  dateOnRoad?: Date | null;
  mileage?: number | null;
  transmission: Transmission;
  hand?: number | null;
  ownership: Ownership;
  tariffPrice?: number | null;
  openingPrice?: number | null;
  imageUrl?: string | null;
  /** Live status string from the feed (e.g. auction state). */
  status?: string | null;
}

export interface CarWithAuction extends Car {
  auction: { externalId: string; title: string; status: string };
}

/**
 * Idempotent UPSERT keyed on the deterministic public lot URL.
 * - On create: set firstSeenAt + lastSeenAt to now.
 * - On update: refresh attributes, bump lastSeenAt, update lastPrice/lastStatus,
 *   and never overwrite firstSeenAt or notificationSentAt.
 */
export async function upsertCar(input: CarUpsertInput): Promise<Car> {
  const now = new Date();
  const currentPrice = input.openingPrice ?? input.tariffPrice ?? null;

  const attributes = {
    lotId: input.lotId,
    auctionId: input.auctionId,
    makeModel: input.makeModel,
    modelYear: input.modelYear ?? null,
    dateOnRoad: input.dateOnRoad ?? null,
    mileage: input.mileage ?? null,
    transmission: input.transmission,
    hand: input.hand ?? null,
    ownership: input.ownership,
    tariffPrice: input.tariffPrice ?? null,
    openingPrice: input.openingPrice ?? null,
    imageUrl: input.imageUrl ?? null,
    lastPrice: currentPrice,
    lastStatus: input.status ?? null,
  };

  return prisma.car.upsert({
    where: { lotUrl: input.lotUrl },
    create: {
      lotUrl: input.lotUrl,
      ...attributes,
      firstSeenAt: now,
      lastSeenAt: now,
    },
    update: {
      ...attributes,
      lastSeenAt: now,
    },
  });
}

/** Cars that have never triggered a notification yet (notificationSentAt is null). */
export async function findUnnotifiedCars(): Promise<Car[]> {
  return prisma.car.findMany({
    where: { notificationSentAt: null },
    orderBy: { firstSeenAt: 'desc' },
  });
}

/** Mark a car as notified (idempotency guard for the notification pipeline). */
export async function markCarNotified(carId: number, when: Date = new Date()): Promise<void> {
  await prisma.car.update({
    where: { id: carId },
    data: { notificationSentAt: when },
  });
}

/** Dashboard query: fetch cars (with their auction) using a flexible where + sort. */
export async function findCars(args: {
  where?: Prisma.CarWhereInput;
  orderBy?: Prisma.CarOrderByWithRelationInput;
}): Promise<CarWithAuction[]> {
  return prisma.car.findMany({
    where: args.where,
    orderBy: args.orderBy ?? { firstSeenAt: 'desc' },
    include: { auction: { select: { externalId: true, title: true, status: true } } },
  }) as Promise<CarWithAuction[]>;
}

export async function getCarByLotUrl(lotUrl: string): Promise<Car | null> {
  return prisma.car.findUnique({ where: { lotUrl } });
}

export async function countCars(where?: Prisma.CarWhereInput): Promise<number> {
  return prisma.car.count({ where });
}
