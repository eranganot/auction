/**
 * Seed the single default UserFilter (single-admin MVP).
 *
 * Product defaults (Israeli used-car market):
 *   - min model year: 2022
 *   - max mileage:    100,000 km
 *   - max hand:       3
 *   - max price:      none (no cap)
 *   - transmission:   AUTOMATIC only
 *   - ownership:      any
 *
 * Idempotent: if an active filter already exists, the seed leaves it untouched.
 */
import { PrismaClient, Transmission } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const existing = await prisma.userFilter.findFirst({ where: { isActive: true } });
  if (existing) {
    // eslint-disable-next-line no-console
    console.log(`Active filter already present (id=${existing.id}); skipping seed.`);
    return;
  }

  const filter = await prisma.userFilter.create({
    data: {
      name: 'default',
      minModelYear: 2022,
      maxMileage: 100_000,
      maxHand: 3,
      maxPrice: null,
      transmission: [Transmission.AUTOMATIC],
      ownership: [],
      isActive: true,
    },
  });

  // eslint-disable-next-line no-console
  console.log(`Seeded default UserFilter (id=${filter.id}).`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
