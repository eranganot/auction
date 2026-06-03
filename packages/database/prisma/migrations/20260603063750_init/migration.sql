-- CreateEnum
CREATE TYPE "Transmission" AS ENUM ('AUTOMATIC', 'MANUAL', 'ROBOTIC', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "Ownership" AS ENUM ('PRIVATE', 'COMPANY', 'LEASING', 'RENTAL', 'GOV', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "AuctionStatus" AS ENUM ('PENDING', 'READY', 'RUNNING', 'ENDED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('TELEGRAM', 'EMAIL');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "ScrapeStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "Auction" (
    "id" SERIAL NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "AuctionStatus" NOT NULL DEFAULT 'UNKNOWN',
    "houseCode" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "url" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Auction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Car" (
    "id" SERIAL NOT NULL,
    "lotId" TEXT NOT NULL,
    "lotUrl" TEXT NOT NULL,
    "makeModel" TEXT NOT NULL,
    "modelYear" INTEGER,
    "dateOnRoad" TIMESTAMP(3),
    "mileage" INTEGER,
    "transmission" "Transmission" NOT NULL DEFAULT 'UNKNOWN',
    "hand" INTEGER,
    "ownership" "Ownership" NOT NULL DEFAULT 'UNKNOWN',
    "tariffPrice" INTEGER,
    "openingPrice" INTEGER,
    "imageUrl" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastPrice" INTEGER,
    "lastStatus" TEXT,
    "notificationSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "auctionId" INTEGER NOT NULL,

    CONSTRAINT "Car_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFilter" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'default',
    "minModelYear" INTEGER,
    "minDateOnRoad" TIMESTAMP(3),
    "maxMileage" INTEGER,
    "maxHand" INTEGER,
    "maxPrice" INTEGER,
    "transmission" "Transmission"[],
    "ownership" "Ownership"[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserFilter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "carId" INTEGER NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "payload" TEXT,
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrapeRun" (
    "id" SERIAL NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "catalogsProcessed" INTEGER NOT NULL DEFAULT 0,
    "carsScraped" INTEGER NOT NULL DEFAULT 0,
    "carsMatched" INTEGER NOT NULL DEFAULT 0,
    "notificationsSent" INTEGER NOT NULL DEFAULT 0,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "status" "ScrapeStatus" NOT NULL DEFAULT 'RUNNING',
    "errorLog" TEXT,

    CONSTRAINT "ScrapeRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Auction_externalId_key" ON "Auction"("externalId");

-- CreateIndex
CREATE INDEX "Auction_status_idx" ON "Auction"("status");

-- CreateIndex
CREATE INDEX "Auction_startsAt_idx" ON "Auction"("startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Car_lotUrl_key" ON "Car"("lotUrl");

-- CreateIndex
CREATE INDEX "Car_modelYear_idx" ON "Car"("modelYear");

-- CreateIndex
CREATE INDEX "Car_mileage_idx" ON "Car"("mileage");

-- CreateIndex
CREATE INDEX "Car_openingPrice_idx" ON "Car"("openingPrice");

-- CreateIndex
CREATE INDEX "Car_transmission_idx" ON "Car"("transmission");

-- CreateIndex
CREATE INDEX "Car_lastStatus_idx" ON "Car"("lastStatus");

-- CreateIndex
CREATE INDEX "Car_notificationSentAt_idx" ON "Car"("notificationSentAt");

-- CreateIndex
CREATE INDEX "Car_auctionId_idx" ON "Car"("auctionId");

-- CreateIndex
CREATE UNIQUE INDEX "Car_auctionId_lotId_key" ON "Car"("auctionId", "lotId");

-- CreateIndex
CREATE INDEX "UserFilter_isActive_idx" ON "UserFilter"("isActive");

-- CreateIndex
CREATE INDEX "Notification_channel_idx" ON "Notification"("channel");

-- CreateIndex
CREATE INDEX "Notification_status_idx" ON "Notification"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_carId_channel_key" ON "Notification"("carId", "channel");

-- CreateIndex
CREATE INDEX "ScrapeRun_status_idx" ON "ScrapeRun"("status");

-- CreateIndex
CREATE INDEX "ScrapeRun_startedAt_idx" ON "ScrapeRun"("startedAt");

-- AddForeignKey
ALTER TABLE "Car" ADD CONSTRAINT "Car_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "Auction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;

