import { PrismaClient } from '@prisma/client';

// Singleton PrismaClient. A single instance is shared across the process to
// avoid exhausting the Postgres connection pool (especially relevant under
// hot-reload in development).
declare global {
  // eslint-disable-next-line no-var
  var __bidspiritPrisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  global.__bidspiritPrisma ??
  new PrismaClient({
    log: process.env.PRISMA_LOG === 'true' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__bidspiritPrisma = prisma;
}

export async function disconnect(): Promise<void> {
  await prisma.$disconnect();
}
