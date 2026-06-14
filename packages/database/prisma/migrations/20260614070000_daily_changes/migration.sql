-- CreateEnum
CREATE TYPE "ChangeType" AS ENUM ('NEW', 'REMOVED');

-- AlterEnum
ALTER TYPE "NotificationChannel" ADD VALUE 'WEBPUSH';

-- AlterTable
ALTER TABLE "Car" ADD COLUMN     "isMatch" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "matchStateChangedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ChangeEvent" (
    "id" SERIAL NOT NULL,
    "carId" INTEGER NOT NULL,
    "type" "ChangeType" NOT NULL,
    "makeModel" TEXT NOT NULL,
    "lotUrl" TEXT NOT NULL,
    "reason" TEXT,
    "runId" INTEGER,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChangeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" SERIAL NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChangeEvent_detectedAt_idx" ON "ChangeEvent"("detectedAt");

-- CreateIndex
CREATE INDEX "ChangeEvent_type_idx" ON "ChangeEvent"("type");

-- CreateIndex
CREATE INDEX "ChangeEvent_carId_idx" ON "ChangeEvent"("carId");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "Car_isMatch_idx" ON "Car"("isMatch");

-- AddForeignKey
ALTER TABLE "ChangeEvent" ADD CONSTRAINT "ChangeEvent_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;

