// @bidspirit/database — the only module that talks to Prisma directly.
// Apps and the shared package consume the typed repository helpers and the
// re-exported Prisma enums/model types from here, never @prisma/client.

export { prisma, disconnect } from './client';

export * from './repositories/auctions';
export * from './repositories/cars';
export * from './repositories/filters';
export * from './repositories/notifications';
export * from './repositories/runs';
export * from './repositories/changes';
export * from './repositories/push';

// Re-export Prisma enums as runtime values.
export {
  Transmission,
  Ownership,
  AuctionStatus,
  NotificationChannel,
  NotificationStatus,
  ScrapeStatus,
  ChangeType,
} from '@prisma/client';

// Re-export Prisma model row types (type-only).
export type {
  Auction,
  Car,
  UserFilter,
  Notification,
  ScrapeRun,
  ChangeEvent,
  PushSubscription,
  Prisma,
} from '@prisma/client';
