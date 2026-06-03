// @bidspirit/database — the only module that talks to Prisma directly.
// Apps and the shared package consume the typed repository helpers and the
// re-exported Prisma enums/model types from here, never @prisma/client.

export { prisma, disconnect } from './client';

export * from './repositories/auctions';
export * from './repositories/cars';
export * from './repositories/filters';
export * from './repositories/notifications';
export * from './repositories/runs';

// Re-export Prisma enums as runtime values.
export {
  Transmission,
  Ownership,
  AuctionStatus,
  NotificationChannel,
  NotificationStatus,
  ScrapeStatus,
} from '@prisma/client';

// Re-export Prisma model row types (type-only).
export type { Auction, Car, UserFilter, Notification, ScrapeRun, Prisma } from '@prisma/client';
