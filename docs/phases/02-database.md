# Phase 2 — Database & Prisma Schema

**Goal:** Production-grade PostgreSQL schema with idempotent writes and full state
tracking, accessed only through `/packages/database`.

## Entities

- **Auction** (catalog): externalId (unique), title, status, startsAt, endsAt, url,
  firstSeenAt, lastSeenAt, timestamps.
- **Car** (auction lot): the core record.
  - Identity: `lotId` (stable) and/or `lotUrl` (unique) — UPSERT key.
  - Fields: makeModel, modelYear, dateOnRoad, mileage (Int), transmission (enum),
    hand (Int), ownership (enum), tariffPrice (Int), openingPrice (Int), lotUrl.
  - State: firstSeenAt, lastSeenAt, lastPrice, lastStatus, notificationSentAt.
  - Relation: auctionId → Auction.
- **UserFilter** (preferences): minModelYear, minDateOnRoad, maxMileage, transmission[],
  maxHand, ownership[], maxPrice, isActive, timestamps. (Single-admin MVP; schema
  allows future `userId`.)
- **Notification**: carId, channel (TELEGRAM|EMAIL), status, payload, sentAt — unique
  on (carId, channel) to prevent repeat alerts.
- **ScrapeRun**: startedAt, finishedAt, durationMs, catalogsProcessed, carsScraped,
  carsMatched, notificationsSent, failures, status (RUNNING|SUCCESS|FAILED), errorLog.
  Also serves as the **execution lock** (one RUNNING row at a time).

## Enums

- `Transmission { AUTOMATIC, MANUAL, ROBOTIC, UNKNOWN }`
- `Ownership { PRIVATE, COMPANY, LEASING, RENTAL, GOV, UNKNOWN }`
- `NotificationChannel`, `ScrapeStatus`, `AuctionStatus`.

## Indexes

- Car: unique(lotUrl), index(modelYear), index(openingPrice), index(lastStatus),
  index(notificationSentAt).
- Auction: unique(externalId), index(status).
- Notification: unique(carId, channel).

## Steps

1. Define `schema.prisma` with the above.
2. `prisma migrate dev --name init` → committed migration.
3. Export a singleton Prisma client + typed repository helpers (cars, auctions,
   filters, notifications, runs) so apps never import Prisma directly.
4. Seed script: one default `UserFilter` (sensible Israeli-market defaults).

## Exit criteria

Migration applies to a fresh Postgres; repository helpers compile and expose
UPSERT-by-lot and "new unnotified matches" queries.
