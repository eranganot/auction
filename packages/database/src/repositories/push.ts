import type { PushSubscription } from '@prisma/client';
import { prisma } from '../client';

export interface PushSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string | null;
}

/** Upsert a browser Web Push subscription, keyed on its unique endpoint. */
export async function savePushSubscription(
  input: PushSubscriptionInput,
): Promise<PushSubscription> {
  const now = new Date();
  return prisma.pushSubscription.upsert({
    where: { endpoint: input.endpoint },
    create: {
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      userAgent: input.userAgent ?? null,
      lastUsedAt: now,
    },
    update: { p256dh: input.p256dh, auth: input.auth, lastUsedAt: now },
  });
}

export async function listPushSubscriptions(): Promise<PushSubscription[]> {
  return prisma.pushSubscription.findMany();
}

/** Remove a dead subscription (call when the push service returns 404/410). */
export async function deletePushSubscription(endpoint: string): Promise<void> {
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
}

export async function countPushSubscriptions(): Promise<number> {
  return prisma.pushSubscription.count();
}
