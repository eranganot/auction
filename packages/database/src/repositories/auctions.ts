import type { Auction, AuctionStatus, Prisma } from '@prisma/client';
import { prisma } from '../client';

export interface AuctionUpsertInput {
  externalId: string;
  title: string;
  status: AuctionStatus;
  houseCode?: string | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  url?: string | null;
}

/**
 * Idempotent UPSERT keyed on externalId (Bidspirit intKey). On re-scrape we
 * refresh mutable fields and bump lastSeenAt, but never touch firstSeenAt.
 */
export async function upsertAuction(input: AuctionUpsertInput): Promise<Auction> {
  const now = new Date();
  const mutable = {
    title: input.title,
    status: input.status,
    houseCode: input.houseCode ?? null,
    startsAt: input.startsAt ?? null,
    endsAt: input.endsAt ?? null,
    url: input.url ?? null,
  };

  return prisma.auction.upsert({
    where: { externalId: input.externalId },
    create: {
      externalId: input.externalId,
      ...mutable,
      firstSeenAt: now,
      lastSeenAt: now,
    },
    update: {
      ...mutable,
      lastSeenAt: now,
    },
  });
}

export async function getAuctionByExternalId(externalId: string): Promise<Auction | null> {
  return prisma.auction.findUnique({ where: { externalId } });
}

export async function listAuctions(where?: Prisma.AuctionWhereInput): Promise<Auction[]> {
  return prisma.auction.findMany({ where, orderBy: { startsAt: 'asc' } });
}
