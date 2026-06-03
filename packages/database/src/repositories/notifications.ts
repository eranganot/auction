import type { Notification, NotificationChannel, NotificationStatus } from '@prisma/client';
import { prisma } from '../client';

export interface RecordNotificationInput {
  carId: number;
  channel: NotificationChannel;
  status: NotificationStatus;
  payload?: string | null;
  error?: string | null;
  sentAt?: Date | null;
}

/**
 * Idempotent record of a notification attempt. Unique on (carId, channel)
 * guarantees a given car is never alerted twice on the same channel.
 */
export async function recordNotification(input: RecordNotificationInput): Promise<Notification> {
  const data = {
    status: input.status,
    payload: input.payload ?? null,
    error: input.error ?? null,
    sentAt: input.sentAt ?? (input.status === 'SENT' ? new Date() : null),
  };

  return prisma.notification.upsert({
    where: { carId_channel: { carId: input.carId, channel: input.channel } },
    create: { carId: input.carId, channel: input.channel, ...data },
    update: data,
  });
}

/** Has this car already been (successfully) notified on this channel? */
export async function hasNotification(
  carId: number,
  channel: NotificationChannel,
): Promise<boolean> {
  const existing = await prisma.notification.findUnique({
    where: { carId_channel: { carId, channel } },
  });
  return existing?.status === 'SENT';
}

export async function countNotifications(): Promise<number> {
  return prisma.notification.count({ where: { status: 'SENT' } });
}
